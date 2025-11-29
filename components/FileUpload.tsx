'use client';

import { useState } from 'react';

interface FileUploadProps {
  label: string;
  name: string;
  required?: boolean;
  accept?: string;
  onChange: (file: File | null) => void;
  className?: string;
}

export default function FileUpload({
  label,
  name,
  required = false,
  accept,
  onChange,
  className = '',
}: FileUploadProps) {
  const [fileName, setFileName] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFileName(file?.name || '');
    onChange(file);
  };

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
          Choose File / 選擇文件
        </label>
        <span className="ml-3 text-sm text-gray-500 truncate">
          {fileName || 'No file chosen / 未選擇文件'}
        </span>
        <input
          id={name}
          name={name}
          type="file"
          required={required}
          accept={accept}
          onChange={handleFileChange}
          className="sr-only"
        />
      </div>
    </div>
  );
}
