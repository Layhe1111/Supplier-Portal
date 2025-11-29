import React from 'react';

interface FormSelectProps {
  label: string;
  name: string;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  multiple?: boolean;
  type?: 'dropdown' | 'checkbox' | 'radio';
}

export default function FormSelect({
  label,
  name,
  value,
  onChange,
  options,
  required = false,
  multiple = false,
  type = 'dropdown',
}: FormSelectProps) {
  const handleCheckboxChange = (optionValue: string) => {
    if (multiple && Array.isArray(value)) {
      const newValue = value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue];
      onChange(newValue);
    }
  };

  if (type === 'checkbox' && multiple) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-light text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="space-y-2">
          {options.map((option) => (
            <label key={option.value} className="flex items-center">
              <input
                type="checkbox"
                name={`${name}-${option.value}`}
                checked={Array.isArray(value) && value.includes(option.value)}
                onChange={() => handleCheckboxChange(option.value)}
                className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'radio') {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-light text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="space-y-2">
          {options.map((option) => (
            <label key={option.value} className="flex items-center">
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={(e) => onChange(e.target.value)}
                className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-light text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        id={name}
        name={name}
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 sm:text-sm"
      >
        <option value="">Select... / 請選擇...</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
