'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

const sizeStyles = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[90vw]',
};

export function Modal({ open, onClose, title, description, children, size = 'md', className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) { document.addEventListener('keydown', handleEsc); document.body.style.overflow = 'hidden'; }
    return () => { document.removeEventListener('keydown', handleEsc); document.body.style.overflow = ''; };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div ref={overlayRef} className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className={cn('relative z-10 w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-xl', sizeStyles[size], className)}>
        {(title || description) && (
          <div className="flex items-start justify-between border-b border-[rgb(var(--border))] px-6 py-4">
            <div>
              {title && <h2 className="text-[15px] font-semibold text-[rgb(var(--foreground))]">{title}</h2>}
              {description && <p className="mt-1 text-[13px] text-[rgb(var(--muted-foreground))]">{description}</p>}
            </div>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-[rgb(var(--muted-foreground))] transition-colors hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  side?: 'right' | 'left';
  className?: string;
}

export function Drawer({ open, onClose, title, description, children, side = 'right', className }: DrawerProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) { document.addEventListener('keydown', handleEsc); document.body.style.overflow = 'hidden'; }
    return () => { document.removeEventListener('keydown', handleEsc); document.body.style.overflow = ''; };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className={cn('relative ml-auto flex h-full w-full max-w-lg flex-col border-l border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-xl', side === 'left' && 'ml-0 mr-auto border-l-0 border-r', className)}>
        {(title || description) && (
          <div className="flex items-start justify-between border-b border-[rgb(var(--border))] px-6 py-4">
            <div>
              {title && <h2 className="text-[15px] font-semibold text-[rgb(var(--foreground))]">{title}</h2>}
              {description && <p className="mt-1 text-[13px] text-[rgb(var(--muted-foreground))]">{description}</p>}
            </div>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-[rgb(var(--muted-foreground))] transition-colors hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
