// app/api/ppt/worker/route.js
// -----------------------------------------------------------------------------
// POST /api/ppt/worker
// Triggered by Vercel Cron every minute.
//
// Behavior:
// - Claim exactly ONE pending job (with conditional update lock)
// - Run full Agent workflow
// - Render PPTX, upload file, mark job as done/failed
// - Return quickly with processedJobId (or null if queue empty)
// -----------------------------------------------------------------------------

import { NextResponse } from 'next/server';
import { claimNextPendingJob } from '@/lib/ppt/jobs';
import { processOneJob } from '@/lib/ppt/workerProcess';

export const runtime = 'nodejs';
export const maxDuration = 60;

function isLocalDevelopmentRequest(request) {
  if (process.env.NODE_ENV !== 'development') return false;

  const host = (request.headers.get('host') || '').toLowerCase();
  const forwardedHost = (request.headers.get('x-forwarded-host') || '').toLowerCase();
  const source = `${host} ${forwardedHost}`;

  return (
    source.includes('localhost') ||
    source.includes('127.0.0.1') ||
    source.includes('::1')
  );
}

function isAuthorizedCronRequest(request) {
  // Local DX: allow local dev calls so "Generate PPT" works without Vercel Cron.
  if (isLocalDevelopmentRequest(request)) {
    return true;
  }

  // Option A (recommended): set CRON_SECRET in Vercel and send Bearer token.
  const cronSecret = (process.env.CRON_SECRET || '').trim();
  const authHeader = request.headers.get('authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (cronSecret) {
    return bearer === cronSecret;
  }

  // Option B fallback: trust Vercel cron marker header if secret is not configured.
  // Note: using CRON_SECRET is safer.
  const vercelCron = request.headers.get('x-vercel-cron');
  return Boolean(vercelCron);
}

export async function POST(request) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
    }

    const job = await claimNextPendingJob();

    if (!job) {
      return NextResponse.json({ ok: true, processedJobId: null }, { status: 200 });
    }

    const result = await processOneJob(job, { hardTimeoutMs: 55_000 });

    return NextResponse.json(
      {
        ok: result.ok,
        processedJobId: result.processedJobId || null,
        error: result.error || null,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected worker error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
