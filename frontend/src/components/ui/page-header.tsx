'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/cn';

interface PageHeaderProps {
  title: string;
  description?: string;
  back?: string | boolean;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, back, actions, className }: PageHeaderProps) {
  const router = useRouter();

  return (
    <div className={cn('flex items-start justify-between', className)}>
      <div className="flex items-center gap-3">
        {back && (
          <button
            onClick={() => typeof back === 'string' ? router.push(back) : router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgb(var(--border))] text-[rgb(var(--muted-foreground))] transition-colors duration-150 hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-semibold text-[rgb(var(--foreground))]">{title}</h1>
          {description && <p className="mt-0.5 text-[13px] text-[rgb(var(--muted-foreground))]">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
