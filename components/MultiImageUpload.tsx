'use client';

import { useState } from 'react';

interface MultiImageUploadProps {
  label: string;
  name: string;
  required?: boolean;
  maxFiles?: number;
  onChange: (files: File[]) => void;
  className?: string;
}

export default function MultiImageUpload({
  label,
  name,
  required = false,
  maxFiles = 9,
  onChange,
  className = '',
}: MultiImageUploadProps) {
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const remainingSlots = maxFiles - files.length;
    const filesToAdd = newFiles.slice(0, remainingSlots);

    const updatedFiles = [...files, ...filesToAdd];
    setFiles(updatedFiles);
    onChange(updatedFiles);

    // Reset input value so the same file can be selected again
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onChange(updatedFiles);
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
            + Add Images / 添加圖片
          </label>
          <input
            id={name}
            name={name}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            className="sr-only"
          />
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
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-2 border border-gray-200 bg-gray-50 rounded"
              >
                <span className="text-sm text-gray-700 truncate flex-1">
                  {index + 1}. {file.name}
                </span>
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
    </div>
  );
}
