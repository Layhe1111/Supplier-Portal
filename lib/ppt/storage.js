// lib/ppt/storage.js
// -----------------------------------------------------------------------------
// Storage helper functions for PPT files.
// - uploadPptBuffer: uploads generated PPTX into Supabase Storage bucket
// - createDownloadSignedUrl: creates temporary download URL for end users
// -----------------------------------------------------------------------------

import { getSupabaseAdminClient } from './supabaseServer';

export const DEFAULT_PPT_BUCKET = process.env.SUPABASE_BUCKET || 'ppt';

export async function uploadPptBuffer({
  jobId,
  buffer,
  contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  bucket = DEFAULT_PPT_BUCKET,
}) {
  const supabase = getSupabaseAdminClient();

  // We save files under this path format: ppt/{jobId}.pptx
  const filePath = `ppt/${jobId}.pptx`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, buffer, {
      contentType,
      upsert: true,
      cacheControl: '3600',
    });

  if (error) {
    throw new Error(`Failed to upload PPT to storage: ${error.message}`);
  }

  return { bucket, filePath };
}

export async function createDownloadSignedUrl({
  filePath,
  expiresInSeconds = 60 * 60,
  bucket = DEFAULT_PPT_BUCKET,
}) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, expiresInSeconds);

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data?.signedUrl || null;
}
