// lib/ppt/jobs.js
// -----------------------------------------------------------------------------
// Database access helpers for table: ppt_jobs
// -----------------------------------------------------------------------------

import { getSupabaseAdminClient } from './supabaseServer';

export async function createPptJob({ prompt, inputJson }) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from('ppt_jobs')
    .insert({
      status: 'pending',
      progress: 0,
      prompt,
      input_json: inputJson,
      updated_at: new Date().toISOString(),
    })
    .select('id, status, progress, created_at')
    .single();

  if (error) {
    throw new Error(`Failed to create ppt job: ${error.message}`);
  }

  return data;
}

export async function getPptJob(jobId) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from('ppt_jobs')
    .select('id,status,progress,file_path,error,slide_spec,updated_at,created_at,prompt,input_json')
    .eq('id', jobId)
    .single();

  if (error) {
    throw new Error(`Failed to query job: ${error.message}`);
  }

  return data;
}

export async function updatePptJob(jobId, patch) {
  const supabase = getSupabaseAdminClient();

  const payload = {
    ...patch,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('ppt_jobs')
    .update(payload)
    .eq('id', jobId)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to update job: ${error.message}`);
  }

  return data;
}

export async function claimNextPendingJob() {
  const supabase = getSupabaseAdminClient();

  // 1) Pull a few pending candidates (oldest first).
  const { data: candidates, error: listError } = await supabase
    .from('ppt_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(5);

  if (listError) {
    throw new Error(`Failed to list pending jobs: ${listError.message}`);
  }

  if (!candidates || candidates.length === 0) return null;

  // 2) Try to atomically claim one by conditional update.
  //    If another worker already claimed it, update returns 0 rows.
  for (const job of candidates) {
    const { data, error } = await supabase
      .from('ppt_jobs')
      .update({
        status: 'running',
        progress: 5,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id)
      .eq('status', 'pending')
      .select('*')
      .single();

    // If we got row, claim succeeded.
    if (!error && data) return data;
  }

  return null;
}

export async function failPptJob(jobId, message) {
  return updatePptJob(jobId, {
    status: 'failed',
    progress: 100,
    error: message,
  });
}

export async function completePptJob(jobId, { slideSpec, filePath }) {
  return updatePptJob(jobId, {
    status: 'done',
    progress: 100,
    slide_spec: slideSpec,
    file_path: filePath,
    error: null,
  });
}
