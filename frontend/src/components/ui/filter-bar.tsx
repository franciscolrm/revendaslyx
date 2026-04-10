'use client';

import { Search, X, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/cn';

interface FilterBarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  children,
  className,
  actions,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3 shadow-sm',
        className,
      )}
    >
      {onSearchChange && (
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--muted-foreground))]" />
          <input
            type="text"
            value={search ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] pl-9 pr-8 text-[13px] text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--muted-foreground))] transition-colors duration-150 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {children && (
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-[rgb(var(--muted-foreground))]" />
          {children}
        </div>
      )}

      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}

export function FilterSelect({
  value,
  onChange,
  options,
  placeholder = 'Todos',
  className,
}: FilterSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'h-9 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 text-[13px] text-[rgb(var(--foreground))] transition-colors duration-150 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500',
        className,
      )}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
