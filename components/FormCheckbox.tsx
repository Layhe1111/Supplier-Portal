import type { ReactNode } from 'react';

interface FormCheckboxProps {
  label: ReactNode;
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
  className?: string;
  linkLabel?: boolean;
}

export default function FormCheckbox({
  label,
  name,
  checked,
  onChange,
  required = false,
  className = '',
  linkLabel = true,
}: FormCheckboxProps) {
  const labelProps = linkLabel
    ? { htmlFor: name }
    : { onClick: (e: React.MouseEvent<HTMLLabelElement>) => e.preventDefault() };

  return (
    <div className={`flex items-center ${className}`}>
      <input
        id={name}
        name={name}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300"
      />
      <label {...labelProps} className="ml-2 block text-sm font-light text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    </div>
  );
}
