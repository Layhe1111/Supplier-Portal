interface FormSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export default function FormSection({ title, children, className = '' }: FormSectionProps) {
  return (
    <div className={`mb-8 ${className}`}>
      <h2 className="text-lg font-light text-gray-900 mb-4 pb-2 border-b border-gray-200">
        {title}
      </h2>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}
