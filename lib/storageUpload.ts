import { supabase } from '@/lib/supabaseClient';
import { buildStorageFileName } from '@/lib/sanitizeFilename';

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'supplier-files';

export const uploadFileToStorage = async (file: File) => {
  const { data, error } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (error || !user) {
    throw new Error('Please sign in before uploading / 請先登入再上傳');
  }

  const safeName = buildStorageFileName(file.name);
  const objectPath = `${user.id}/${Date.now()}-${safeName}`;
  const { data: uploaded, error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(objectPath, file, { contentType: file.type });

  if (uploadError || !uploaded?.path) {
    throw new Error(uploadError?.message || 'Upload failed');
  }

  return uploaded.path;
};
