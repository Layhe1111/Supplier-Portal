// lib/ppt/workerProcess.js
// -----------------------------------------------------------------------------
// Worker-side job processor (Gamma mode).
//
// Current active flow:
//   pending job -> build Gamma payload -> POST /generations -> save generationId
//   final export/download is handled by /api/ppt/status polling.
//
// Legacy flow (agent->renderPpt->upload) is intentionally retained below as
// comments for rollback context, but not executed.
// -----------------------------------------------------------------------------

import { failPptJob, updatePptJob } from './jobs';
import {
  createGeneration,
  extractGammaUrl,
  extractGenerationId,
  normalizeStatus,
  snapshotGammaPayload,
} from './gammaClient';
import { buildGammaGenerationPayload } from './gammaPayloadBuilder';
import { makeGammaDebugMeta } from './gammaDebug';

function formatError(error) {
  if (error instanceof Error) return error.message;
  return String(error || 'Unknown error');
}

async function withTimeout(promise, timeoutMs, timeoutMessage) {
  let timer = null;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function buildInitialSlideSpecMeta(meta, createResponse, generationId) {
  const providerStatus = normalizeStatus(createResponse);
  const gammaUrl = extractGammaUrl(createResponse);

  return {
    ...meta,
    gamma: makeGammaDebugMeta({
      generationId,
      providerStatus,
      gammaUrl,
      raw: snapshotGammaPayload(createResponse),
    }),
  };
}

export async function processOneJob(job, options = {}) {
  const hardTimeoutMs = options.hardTimeoutMs || 55_000;
  const startedAt = Date.now();

  const ensureNotTimedOut = () => {
    if (Date.now() - startedAt > hardTimeoutMs) {
      throw new Error(`Worker timeout reached (${hardTimeoutMs}ms)`);
    }
  };

  try {
    ensureNotTimedOut();
    const preflightMeta = {
      provider: 'gamma',
      gamma: makeGammaDebugMeta({
        generationId: '',
        providerStatus: 'creating',
      }),
    };

    await updatePptJob(job.id, {
      progress: 10,
      error: null,
      slide_spec: {
        ...(job.slide_spec || {}),
        meta: preflightMeta,
      },
    });

    const prompt = typeof job.prompt === 'string' ? job.prompt : '';
    const inputJson = job.input_json || {};
    const { request, meta } = buildGammaGenerationPayload({
      prompt,
      inputJson,
    });

    ensureNotTimedOut();
    const createTimeoutMs = Math.max(12_000, Number(process.env.GAMMA_CREATE_TIMEOUT_MS) || 25_000);
    const createResponse = await withTimeout(
      createGeneration(request, {
        timeoutMs: createTimeoutMs,
        retries: 1,
      }),
      createTimeoutMs + 2_000,
      'Gamma create stage timed out'
    );

    const generationId = extractGenerationId(createResponse);
    if (!generationId) {
      throw new Error('Gamma create succeeded but generationId is missing in response');
    }

    const slideSpec = {
      meta: buildInitialSlideSpecMeta(meta, createResponse, generationId),
      gammaRequest: snapshotGammaPayload({
        ...request,
        inputText: `[redacted length=${String(request.inputText || '').length}]`,
      }),
    };

    ensureNotTimedOut();
    await updatePptJob(job.id, {
      status: 'running',
      progress: 15,
      slide_spec: slideSpec,
      error: null,
    });

    return {
      ok: true,
      processedJobId: job.id,
      generationId,
    };
  } catch (error) {
    const message = formatError(error);
    await failPptJob(job.id, message);
    return { ok: false, processedJobId: job.id, error: message };
  }
}

/*
Legacy rollback context:
  - Previous worker flow used runPptAgentWorkflow() + renderPpt() + uploadPptBuffer().
  - This has been replaced by Gamma Generate API flow.
*/
