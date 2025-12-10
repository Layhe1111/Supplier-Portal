import React, { useState, useRef, useEffect } from 'react';

interface MultiSelectWithSearchProps {
  label: string;
  name: string;
  value: string[];
  onChange: (value: string[]) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  emptyMessage?: string;
}

export default function MultiSelectWithSearch({
  label,
  name,
  value = [],
  onChange,
  options,
  required = false,
  placeholder = 'Select... / 請選擇...',
  emptyMessage = 'No options available / 沒有可用選項',
}: MultiSelectWithSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter options based on search term
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get selected labels for display
  const selectedLabels = options
    .filter((option) => value.includes(option.value))
    .map((option) => option.label);

  // Handle checkbox change
  const handleToggle = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-light text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Selected items display / Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 bg-white text-left focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 flex items-center justify-between"
      >
        <div className="flex-1 min-w-0">
          {selectedLabels.length === 0 ? (
            <span className="text-gray-400 text-sm">{placeholder}</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {selectedLabels.map((label, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
        <svg
          className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 shadow-lg max-h-64 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
            <input
              type="text"
              placeholder="Search... / 搜尋..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Options list */}
          <div className="overflow-y-auto max-h-48">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={value.includes(option.value)}
                    onChange={() => handleToggle(option.value)}
                    className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded cursor-pointer"
                  />
                  <span className="ml-2 text-sm text-gray-700 select-none">{option.label}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}

      {/* Hidden input for form validation */}
      {required && (
        <input
          type="text"
          name={name}
          value={value.join(',')}
          required={required}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
