// app/api/ppt/generate/route.js
// -----------------------------------------------------------------------------
// POST /api/ppt/generate
// Input : { prompt: string, dataJson: object }
// Output: { jobId: string }
//
// This endpoint only enqueues work (fast), so frontend can get jobId immediately.
// Actual generation is done by /api/ppt/worker (cron-driven background worker).
// -----------------------------------------------------------------------------

import { NextResponse } from 'next/server';
import { createPptJob } from '@/lib/ppt/jobs';
import { FIXED_GAMMA_PROMPT } from '@/lib/ppt/fixedPrompt';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function kickWorkerInDevelopment(request) {
  if (process.env.NODE_ENV !== 'development') return;

  const workerUrl = new URL('/api/ppt/worker', request.url).toString();
  const workerCall = fetch(workerUrl, {
    method: 'POST',
    cache: 'no-store',
  }).catch((error) => {
    console.warn('[PPT DEV] Failed to trigger local worker:', error);
  });

  // Keep the request alive briefly so the background worker call is reliably dispatched.
  await Promise.race([
    workerCall,
    new Promise((resolve) => setTimeout(resolve, 250)),
  ]);
}

function normalizeInput(body) {
  // Product requirement: prompt is fixed on the server side.
  // Frontend-provided prompt is ignored to keep behavior deterministic.
  const prompt = FIXED_GAMMA_PROMPT;
  const dataJson = body?.dataJson || body?.data;
  return { prompt, dataJson };
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { prompt, dataJson } = normalizeInput(body);

    if (!dataJson || typeof dataJson !== 'object' || Array.isArray(dataJson)) {
      return NextResponse.json({ error: 'dataJson must be an object' }, { status: 400 });
    }

    const job = await createPptJob({ prompt, inputJson: dataJson });
    await kickWorkerInDevelopment(request);

    return NextResponse.json({ jobId: job.id }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
