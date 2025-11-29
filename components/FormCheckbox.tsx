interface FormCheckboxProps {
  label: string;
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export default function FormCheckbox({
  label,
  name,
  checked,
  onChange,
  className = '',
}: FormCheckboxProps) {
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
      <label htmlFor={name} className="ml-2 block text-sm font-light text-gray-700">
        {label}
      </label>
    </div>
  );
}
