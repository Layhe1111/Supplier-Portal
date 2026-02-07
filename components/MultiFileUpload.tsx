'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { uploadFileToStorage } from '@/lib/storageUpload';
import { extractOriginalFilename } from '@/lib/sanitizeFilename';
import { useToast } from '@/components/ToastProvider';

interface MultiFileUploadProps {
  label: string;
  name: string;
  required?: boolean;
  accept?: string;
  maxFiles?: number;
  onChange: (paths: string[]) => void;
  value?: Array<string | File> | null;
  className?: string;
}

const getDisplayName = (path: string) => extractOriginalFilename(path);

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'supplier-files';

export default function MultiFileUpload({
  label,
  name,
  required = false,
  accept,
  maxFiles = 10,
  onChange,
  value,
  className = '',
}: MultiFileUploadProps) {
  const toast = useToast();
  const [files, setFiles] = useState<{ name: string; path: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const formattedAccept =
    accept
      ?.split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .join(', ') || '';

  useEffect(() => {
    if (!value || value.length === 0) {
      setFiles([]);
      return;
    }
    const nextFiles = value
      .filter((item): item is string => typeof item === 'string')
      .map((path) => ({ name: getDisplayName(path), path }));
    setFiles(nextFiles);
  }, [value]);

  useEffect(() => {
    if (!error) return;
    toast.error(error);
    setError('');
  }, [error, toast]);

  const handlePreview = async (path: string) => {
    if (!path || uploading) return;
    setError('');
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(path, 60 * 60);
      if (error || !data?.signedUrl) {
        throw new Error(error?.message || 'Failed to open file');
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open file');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const remainingSlots = maxFiles - files.length;
    const filesToAdd = selected.slice(0, remainingSlots);

    if (filesToAdd.length === 0) {
      e.target.value = '';
      return;
    }

    setUploading(true);
    setError('');
    const uploaded: { name: string; path: string }[] = [];
    try {
      for (const file of filesToAdd) {
        const path = await uploadFileToStorage(file);
        uploaded.push({ name: file.name, path });
      }
      const updated = [...files, ...uploaded];
      setFiles(updated);
      onChange(updated.map((item) => item.path));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    onChange(updated.map((item) => item.path));
  };

  return (
    <div className={className}>
      <label className="block text-sm font-light text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex items-center">
        <label
          htmlFor={name}
          className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-light text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-colors"
        >
          {uploading ? 'Uploading...' : 'Choose Files / 選擇文件'}
        </label>
        <span className="ml-3 text-sm text-gray-500 truncate">
          {files.length > 0 ? `${files.length} file(s)` : 'No file chosen / 未選擇文件'}
        </span>
        <input
          id={name}
          name={name}
          type="file"
          multiple
          accept={accept}
          onChange={handleFileChange}
          className="sr-only"
          disabled={uploading}
        />
      </div>

      {formattedAccept && (
        <p className="text-xs text-gray-500 mt-1">
          Accepted formats: {formattedAccept} / 支援格式：{formattedAccept}
        </p>
      )}

      {files.length > 0 && (
        <div className="mt-2 space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.path}-${index}`}
              className="flex items-center justify-between p-2 border border-gray-200 bg-gray-50 rounded"
            >
              <button
                type="button"
                onClick={() => handlePreview(file.path)}
                className="text-left text-sm text-gray-700 truncate flex-1 underline hover:text-gray-900"
              >
                {index + 1}. {file.name}
              </button>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="ml-2 text-red-500 hover:text-red-700 text-sm font-medium"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
