import { cn } from '@/lib/cn';

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function SelectField({ label, error, options, placeholder = 'Selecione...', className, required, ...props }: SelectFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="block text-[13px] font-medium text-[rgb(var(--foreground))]">
          {label}{required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <select
        className={cn(
          'h-9 w-full rounded-lg border bg-[rgb(var(--card))] px-3 text-[13px] text-[rgb(var(--foreground))] transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500',
          error ? 'border-red-500' : 'border-[rgb(var(--border))]',
        )}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function InputField({ label, error, className, required, ...props }: InputFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="block text-[13px] font-medium text-[rgb(var(--foreground))]">
          {label}{required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <input
        className={cn(
          'h-9 w-full rounded-lg border bg-[rgb(var(--card))] px-3 text-[13px] text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--muted-foreground))] transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500',
          error ? 'border-red-500' : 'border-[rgb(var(--border))]',
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface TextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function TextareaField({ label, error, className, required, ...props }: TextareaFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="block text-[13px] font-medium text-[rgb(var(--foreground))]">
          {label}{required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <textarea
        className={cn(
          'w-full rounded-lg border bg-[rgb(var(--card))] px-3 py-2 text-[13px] text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--muted-foreground))] transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500',
          error ? 'border-red-500' : 'border-[rgb(var(--border))]',
        )}
        rows={4}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
