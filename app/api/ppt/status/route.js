// app/api/ppt/status/route.js
// -----------------------------------------------------------------------------
// GET /api/ppt/status?jobId=...
// Output: { status, progress, downloadUrl?, error?, debug? }
//
// Gamma mode behavior:
// - If job is running and has generationId, this route polls Gamma status.
// - When Gamma completes, this route downloads PPTX, uploads to Supabase,
//   and marks job done.
// -----------------------------------------------------------------------------

import { NextResponse } from 'next/server';
import { Agent, EnvHttpProxyAgent, ProxyAgent } from 'undici';
import { getPptJob, updatePptJob, completePptJob, failPptJob } from '@/lib/ppt/jobs';
import { uploadPptBuffer, createDownloadSignedUrl } from '@/lib/ppt/storage';
import { buildGammaGenerationPayload } from '@/lib/ppt/gammaPayloadBuilder';
import {
  createGeneration,
  extractGammaUrl,
  extractGenerationId,
  extractPptxUrl,
  extractProviderError,
  getGeneration,
  mapProviderProgress,
  normalizeStatus,
  snapshotGammaPayload,
} from '@/lib/ppt/gammaClient';
import { makeGammaDebugMeta } from '@/lib/ppt/gammaDebug';

export const runtime = 'nodejs';
export const maxDuration = 60;
let downloadDispatcher = null;

function safeString(value, fallback = '') {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function getJobMeta(job) {
  const meta = job?.slide_spec?.meta;
  return meta && typeof meta === 'object' ? meta : {};
}

function getGammaMeta(job) {
  const gamma = getJobMeta(job)?.gamma;
  return gamma && typeof gamma === 'object' ? gamma : {};
}

function parseIsoMs(value) {
  const text = safeString(value);
  if (!text) return NaN;
  const ms = Date.parse(text);
  return Number.isFinite(ms) ? ms : NaN;
}

function getElapsedSeconds(job) {
  const now = Date.now();
  const createdAtText = safeString(job?.created_at);
  const updatedAtText = safeString(job?.updated_at);
  const createdAt = createdAtText ? Date.parse(createdAtText) : NaN;
  const updatedAt = updatedAtText ? Date.parse(updatedAtText) : NaN;

  if (Number.isFinite(createdAt)) {
    return Math.max(0, Math.floor((now - createdAt) / 1000));
  }

  if (Number.isFinite(updatedAt)) {
    return Math.max(0, Math.floor((now - updatedAt) / 1000));
  }

  return 0;
}

function getProxyUrl() {
  return safeString(
    process.env.GAMMA_PROXY_URL ||
      process.env.HTTPS_PROXY ||
      process.env.HTTP_PROXY ||
      process.env.ALL_PROXY ||
      ''
  );
}

function getDownloadDispatcher() {
  if (downloadDispatcher) return downloadDispatcher;
  const proxyUrl = getProxyUrl();
  const connectTimeout = Math.max(3_000, Number(process.env.GAMMA_CONNECT_TIMEOUT_MS) || 10_000);
  const useEnvProxy = String(process.env.GAMMA_USE_ENV_PROXY || 'false').toLowerCase() === 'true';

  if (proxyUrl) {
    downloadDispatcher = new ProxyAgent({
      uri: proxyUrl,
      connect: { timeout: connectTimeout },
    });
    return downloadDispatcher;
  }

  if (useEnvProxy) {
    downloadDispatcher = new EnvHttpProxyAgent();
    return downloadDispatcher;
  }

  downloadDispatcher = new Agent({
    connect: { timeout: connectTimeout },
  });
  return downloadDispatcher;
}

async function fetchFileBuffer(url, timeoutMs = 30_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
      dispatcher: getDownloadDispatcher(),
    });
    if (!response.ok) {
      throw new Error(`Failed to download Gamma PPTX (${response.status})`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timer);
  }
}

function buildDebugInfo(job) {
  const slides = Array.isArray(job?.slide_spec?.slides) ? job.slide_spec.slides : [];
  const meta = getJobMeta(job);

  return {
    fixedOutline: Array.isArray(meta.fixedOutline) ? meta.fixedOutline : [],
    finalOutline: Array.isArray(meta.finalOutline)
      ? meta.finalOutline
      : slides.map((s) => s?.title).filter(Boolean),
    skippedSections: Array.isArray(meta.skippedSections) ? meta.skippedSections : [],
    imageAssignments: Array.isArray(meta.imageAssignments)
      ? meta.imageAssignments
      : slides.map((s) => ({
          title: s?.title || 'Untitled',
          images: Array.isArray(s?.images) ? s.images : [],
        })),
    gamma: meta.gamma || null,
  };
}

async function syncRunningGammaJob(job) {
  const gammaMeta = getGammaMeta(job);
  const generationId = safeString(gammaMeta.generationId);
  if (!generationId) {
    const updatedAtMs = parseIsoMs(job?.updated_at);
    const createdAtMs = parseIsoMs(job?.created_at);
    const baseMs = Number.isFinite(updatedAtMs) ? updatedAtMs : createdAtMs;
    const staleSeconds = Number.isFinite(baseMs) ? Math.max(0, Math.floor((Date.now() - baseMs) / 1000)) : 0;
    const staleLimit = Math.max(60, Number(process.env.PPT_RUNNING_NO_GENERATION_TIMEOUT_SEC) || 120);

    if (staleSeconds >= staleLimit) {
      await failPptJob(
        job.id,
        `Job stuck before generation id assignment for ${staleSeconds}s. Please retry.`
      );
      return getPptJob(job.id);
    }
    return job;
  }

  const providerRaw = await getGeneration(generationId, {
    timeoutMs: Math.max(12_000, Number(process.env.GAMMA_STATUS_TIMEOUT_MS) || 30_000),
    retries: 1,
  });
  const providerStatus = normalizeStatus(providerRaw);
  const gammaUrl = extractGammaUrl(providerRaw);
  const pptxUrl = extractPptxUrl(providerRaw);
  const providerError = extractProviderError(providerRaw);

  const baseMeta = getJobMeta(job);
  const currentGammaMeta = getGammaMeta(job);
  const nowIso = new Date().toISOString();
  const queuePendingSince = safeString(currentGammaMeta.queuePendingSince) || nowIso;
  const queuePendingSinceMs = parseIsoMs(queuePendingSince);
  const queuePendingSeconds = Number.isFinite(queuePendingSinceMs)
    ? Math.max(0, Math.floor((Date.now() - queuePendingSinceMs) / 1000))
    : 0;
  const queueRetryCount = Math.max(0, Number(currentGammaMeta.queueRetryCount) || 0);

  const nextMeta = {
    ...baseMeta,
    gamma: makeGammaDebugMeta({
      generationId,
      providerStatus,
      gammaUrl,
      exportUrl: pptxUrl,
      error: providerError,
      raw: snapshotGammaPayload(providerRaw),
    }),
  };
  nextMeta.gamma.queuePendingSince = queuePendingSince;
  nextMeta.gamma.queuePendingSeconds = queuePendingSeconds;
  nextMeta.gamma.queueRetryCount = queueRetryCount;

  if (providerStatus === 'failed') {
    const message = providerError || 'Gamma generation failed';
    await failPptJob(job.id, message);
    return getPptJob(job.id);
  }

  if (providerStatus === 'completed') {
    if (!pptxUrl) {
      const failMsg = 'Gamma completed but pptx url missing';
      await updatePptJob(job.id, { slide_spec: { ...(job.slide_spec || {}), meta: nextMeta } });
      await failPptJob(job.id, failMsg);
      return getPptJob(job.id);
    }

    await updatePptJob(job.id, {
      progress: Math.max(90, Number(job.progress) || 0),
      slide_spec: { ...(job.slide_spec || {}), meta: nextMeta },
    });

    const buffer = await fetchFileBuffer(
      pptxUrl,
      Math.max(10_000, Number(process.env.GAMMA_DOWNLOAD_TIMEOUT_MS) || 35_000)
    );
    const { filePath } = await uploadPptBuffer({
      jobId: job.id,
      buffer,
    });

    await completePptJob(job.id, {
      slideSpec: { ...(job.slide_spec || {}), meta: nextMeta },
      filePath,
    });
    return getPptJob(job.id);
  }

  if (providerStatus === 'pending') {
    const retryAfterSec = Math.max(90, Number(process.env.GAMMA_PENDING_RETRY_AFTER_SEC) || 180);
    const maxRetry = Math.max(0, Math.min(2, Number(process.env.GAMMA_PENDING_MAX_RETRY) || 1));

    if (queuePendingSeconds >= retryAfterSec && queueRetryCount < maxRetry) {
      try {
        const { request, meta } = buildGammaGenerationPayload(
          {
            prompt: safeString(job.prompt),
            inputJson: job.input_json || {},
          },
          { compactMode: true }
        );
        const createResponse = await createGeneration(request, {
          timeoutMs: Math.max(12_000, Number(process.env.GAMMA_CREATE_TIMEOUT_MS) || 25_000),
          retries: 1,
        });
        const retryGenerationId = extractGenerationId(createResponse);
        if (!retryGenerationId) {
          throw new Error('Retry create succeeded but generationId is missing');
        }

        const retriedMeta = {
          ...baseMeta,
          ...meta,
          gamma: makeGammaDebugMeta({
            generationId: retryGenerationId,
            providerStatus: normalizeStatus(createResponse),
            gammaUrl: extractGammaUrl(createResponse),
            raw: snapshotGammaPayload(createResponse),
          }),
        };
        retriedMeta.gamma.queueRetryCount = queueRetryCount + 1;
        retriedMeta.gamma.queuePendingSince = nowIso;
        retriedMeta.gamma.queuePendingSeconds = 0;
        retriedMeta.gamma.previousGenerationId = generationId;
        retriedMeta.gamma.retryReason = `pending>${retryAfterSec}s`;

        await updatePptJob(job.id, {
          progress: Math.max(22, Number(job.progress) || 0),
          slide_spec: { ...(job.slide_spec || {}), meta: retriedMeta },
        });
        return getPptJob(job.id);
      } catch (retryError) {
        nextMeta.gamma.retryError = safeString(
          retryError instanceof Error ? retryError.message : String(retryError || 'retry failed')
        );
      }
    }
  }

  const elapsedSeconds = getElapsedSeconds(job);
  const mappedProgress = mapProviderProgress(
    providerStatus,
    Number(job.progress) || 0,
    elapsedSeconds
  );
  await updatePptJob(job.id, {
    progress: mappedProgress,
    slide_spec: { ...(job.slide_spec || {}), meta: nextMeta },
  });

  return getPptJob(job.id);
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const jobId = safeString(url.searchParams.get('jobId'));

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    let job = await getPptJob(jobId);

    // Gamma mode: status endpoint acts as synchronization point for running jobs.
    if (job.status === 'running') {
      try {
        job = await syncRunningGammaJob(job);
      } catch (syncError) {
        const message = syncError instanceof Error ? syncError.message : 'Gamma polling failed';
        const baseMeta = getJobMeta(job);
        const gammaMeta = getGammaMeta(job);
        const pollFailures = Math.max(0, Number(gammaMeta.pollFailures) || 0) + 1;
        const transientNetworkError = /(aborted|timed out|timeout|fetch failed|network|econn|enotfound|socket)/i.test(
          safeString(message).toLowerCase()
        );
        const maxPollFailures = transientNetworkError
          ? Math.max(6, Number(process.env.GAMMA_MAX_TRANSIENT_POLL_FAILURES) || 10)
          : Math.max(2, Number(process.env.GAMMA_MAX_POLL_FAILURES) || 3);

        const nextMeta = {
          ...baseMeta,
          gamma: {
            ...gammaMeta,
            pollFailures,
            pollError: safeString(message),
            pollErrorAt: new Date().toISOString(),
          },
        };

        if (pollFailures >= maxPollFailures) {
          await updatePptJob(job.id, {
            slide_spec: { ...(job.slide_spec || {}), meta: nextMeta },
          });
          await failPptJob(job.id, `Gamma polling failed repeatedly: ${message}`);
          job = await getPptJob(job.id);
        } else {
          await updatePptJob(job.id, {
            slide_spec: { ...(job.slide_spec || {}), meta: nextMeta },
            progress: Math.max(20, Number(job.progress) || 0),
          });
          job = await getPptJob(job.id);
        }
      }
    }

    const response = {
      status: job.status,
      progress: job.progress,
      error: job.error || null,
      debug: buildDebugInfo(job),
    };

    if (job.status === 'done' && job.file_path) {
      const downloadUrl = await createDownloadSignedUrl({
        filePath: job.file_path,
        expiresInSeconds: 60 * 30,
      });
      response.downloadUrl = downloadUrl;
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
