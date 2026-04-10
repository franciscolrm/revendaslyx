'use client';

import { cn } from '@/lib/cn';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1 border-b border-[rgb(var(--border))] overflow-x-auto', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors duration-150',
            activeTab === tab.id
              ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
              : 'border-transparent text-[rgb(var(--muted-foreground))] hover:border-[rgb(var(--border))] hover:text-[rgb(var(--foreground))]',
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              'ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-medium',
              activeTab === tab.id
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-400'
                : 'bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))]',
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
