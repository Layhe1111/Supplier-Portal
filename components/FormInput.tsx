import { useEffect } from 'react';

interface FormInputProps {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  className?: string;
  min?: string;
  useThousandsSeparator?: boolean;
}

const normalizeNumericInput = (input: string) => {
  const withoutCommas = input.replace(/,/g, '');
  const parts = withoutCommas.split('.');
  const intPart = parts[0].replace(/\D/g, '');
  if (parts.length === 1) {
    return intPart;
  }
  const decPart = parts.slice(1).join('').replace(/\D/g, '');
  return `${intPart}.${decPart}`;
};

const formatWithCommas = (input: string) => {
  const normalized = normalizeNumericInput(input);
  if (!normalized) return '';
  const parts = normalized.split('.');
  const intPart = parts[0];
  const decPart = parts[1];
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (normalized.includes('.')) {
    return `${withCommas}.${decPart ?? ''}`;
  }
  return withCommas;
};

export default function FormInput({
  label,
  name,
  type = 'text',
  required = false,
  placeholder,
  value,
  onChange,
  onBlur,
  className = '',
  min,
  useThousandsSeparator,
}: FormInputProps) {
  const isNumberInput = type === 'number';
  const isYearField =
    /year/i.test(name) ||
    /year/i.test(label) ||
    /年份/.test(label);
  const allowThousandsSeparator =
    isNumberInput && (useThousandsSeparator ?? !isYearField);
  const normalizedValue = isNumberInput ? normalizeNumericInput(value) : value;
  const displayValue = isNumberInput
    ? allowThousandsSeparator
      ? formatWithCommas(normalizedValue)
      : normalizedValue
    : value;
  const handleChange = (nextValue: string) => {
    if (!isNumberInput) {
      onChange(nextValue);
      return;
    }
    onChange(normalizeNumericInput(nextValue));
  };
  const handleBlur = (nextValue: string) => {
    if (!onBlur) return;
    if (!isNumberInput) {
      onBlur(nextValue);
      return;
    }
    onBlur(normalizeNumericInput(nextValue));
  };

  useEffect(() => {
    if (!isNumberInput) return;
    if (normalizedValue !== value) {
      onChange(normalizedValue);
    }
  }, [isNumberInput, normalizedValue, onChange, value]);

  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-light text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={isNumberInput ? 'text' : type}
        required={required}
        placeholder={placeholder}
        value={displayValue}
        inputMode={isNumberInput ? 'decimal' : undefined}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={onBlur ? (e) => handleBlur(e.target.value) : undefined}
        min={isNumberInput ? undefined : min}
        className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 sm:text-sm"
      />
    </div>
  );
}
