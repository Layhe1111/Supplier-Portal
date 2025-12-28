'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { uploadFileToStorage } from '@/lib/storageUpload';

interface FileUploadProps {
  label: string;
  name: string;
  required?: boolean;
  accept?: string;
  onChange: (filePath: string | null) => void;
  value?: File | string | null;
  className?: string;
}

const getDisplayName = (value?: File | string | null) => {
  if (!value) return '';
  if (value instanceof File) return value.name;
  if (typeof value === 'string') {
    const base = value.split('/').pop() || value;
    const match = base.match(/^\d{10,}-(.+)$/);
    return match ? match[1] : base;
  }
  return '';
};

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'supplier-files';

export default function FileUpload({
  label,
  name,
  required = false,
  accept,
  onChange,
  value,
  className = '',
}: FileUploadProps) {
  const [fileName, setFileName] = useState<string>('');
  const [filePath, setFilePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const formattedAccept =
    accept
      ?.split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .join(', ') || '';

  useEffect(() => {
    setFileName(getDisplayName(value));
    if (typeof value === 'string') {
      setFilePath(value);
    } else if (!value) {
      setFilePath(null);
    }
  }, [value]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const path = await uploadFileToStorage(file);
      setFileName(file.name);
      setFilePath(path);
      onChange(path);
    } catch (err) {
      setError((err as Error).message || 'Upload failed');
      setFileName('');
      setFilePath(null);
      onChange(null);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handlePreview = async () => {
    if (uploading) return;
    const path = typeof value === 'string' ? value : filePath;
    if (!path && !(value instanceof File)) return;
    setError('');
    try {
      if (value instanceof File && !path) {
        const url = URL.createObjectURL(value);
        window.open(url, '_blank', 'noopener,noreferrer');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        return;
      }

      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(path as string, 60 * 60);
      if (error || !data?.signedUrl) {
        throw new Error(error?.message || 'Failed to open file');
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open file');
    }
  };

  const canPreview = Boolean(fileName) && (Boolean(filePath) || value instanceof File);

  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-light text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex items-center">
        <label
          htmlFor={name}
          className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-light text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-colors"
        >
          {uploading ? 'Uploading...' : 'Choose File / 選擇文件'}
        </label>
        <span className="ml-3 text-sm text-gray-500 truncate">
          {fileName ? (
            canPreview ? (
              <button
                type="button"
                onClick={handlePreview}
                className="text-gray-700 underline hover:text-gray-900"
              >
                {fileName}
              </button>
            ) : (
              fileName
            )
          ) : (
            'No file chosen / 未選擇文件'
          )}
        </span>
        <input
          id={name}
          name={name}
          type="file"
          required={required && !fileName}
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
      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}
