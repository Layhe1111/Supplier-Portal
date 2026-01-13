'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { uploadFileToStorage } from '@/lib/storageUpload';
import { extractOriginalFilename } from '@/lib/sanitizeFilename';

interface MultiImageUploadProps {
  label: string;
  name: string;
  required?: boolean;
  maxFiles?: number;
  onChange: (paths: string[]) => void;
  value?: Array<string | File> | null;
  className?: string;
}

const getDisplayName = (path: string) => extractOriginalFilename(path);

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'supplier-files';

export default function MultiImageUpload({
  label,
  name,
  required = false,
  maxFiles = 9,
  onChange,
  value,
  className = '',
}: MultiImageUploadProps) {
  const [files, setFiles] = useState<{ name: string; path: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>('');

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
      setPreviewUrl(data.signedUrl);
      setPreviewName(getDisplayName(path));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open file');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const remainingSlots = maxFiles - files.length;
    const filesToAdd = newFiles.slice(0, remainingSlots);

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
      const updatedFiles = [...files, ...uploaded];
      setFiles(updatedFiles);
      onChange(updatedFiles.map((item) => item.path));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }

  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onChange(updatedFiles.map((item) => item.path));
  };

  const handleClosePreview = () => {
    setPreviewUrl(null);
    setPreviewName('');
  };

  return (
    <div className={className}>
      <label className="block text-sm font-light text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
        <span className="text-xs text-gray-500 ml-2">
          (Maximum {maxFiles} images / 最多{maxFiles}張)
        </span>
      </label>

      {files.length < maxFiles && (
        <div className="mb-3">
          <label
            htmlFor={name}
            className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-light text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-colors"
          >
            {uploading ? 'Uploading... / 上傳中...' : '+ Add Images / 添加圖片'}
          </label>
          <input
            id={name}
            name={name}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            className="sr-only"
            disabled={uploading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Accepted formats: images (JPG/PNG/HEIC etc.) / 支援格式：圖片（JPG/PNG/HEIC 等）
          </p>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Selected {files.length} of {maxFiles} images / 已選擇 {files.length} / {maxFiles} 張圖片
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
        </div>
      )}

      {files.length === 0 && (
        <p className="text-sm text-gray-500 mt-2">
          No images selected / 未選擇圖片
        </p>
      )}

      {error && (
        <p className="text-xs text-red-600 mt-2">{error}</p>
      )}

      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={handleClosePreview}
            className="absolute inset-0"
            aria-label="Close preview backdrop"
          />
          <div className="relative z-10 max-w-4xl w-full bg-white border border-gray-200 shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-light text-gray-800 truncate">
                {previewName || 'Preview'}
              </p>
              <button
                type="button"
                onClick={handleClosePreview}
                className="text-gray-500 hover:text-gray-800"
                aria-label="Close preview"
              >
                ✕
              </button>
            </div>
            <div className="p-4 max-h-[80vh] overflow-auto">
              <img
                src={previewUrl}
                alt={previewName || 'Preview'}
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
