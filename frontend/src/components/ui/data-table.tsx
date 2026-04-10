'use client';

import { cn } from '@/lib/cn';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface Column<T = any> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

interface DataTableProps {
  columns: Column<any>[];
  data: any[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: any) => void;
  rowKey?: (row: any) => string;
  className?: string;
  pagination?: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

export function DataTable({
  columns,
  data,
  loading,
  emptyMessage = 'Nenhum registro encontrado',
  onRowClick,
  rowKey,
  className,
  pagination,
}: DataTableProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-sm',
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-[rgb(var(--border))] bg-[rgb(var(--muted))]/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]',
                    col.className,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgb(var(--border))]">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-4 w-20 animate-pulse rounded bg-[rgb(var(--muted))]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-[rgb(var(--muted-foreground))]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={rowKey ? rowKey(row) : i}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'transition-colors duration-100',
                    onRowClick && 'cursor-pointer hover:bg-[rgb(var(--muted))]/50',
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'whitespace-nowrap px-4 py-3 text-[rgb(var(--card-foreground))]',
                        col.className,
                      )}
                    >
                      {col.render ? col.render(row) : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[rgb(var(--border))] px-4 py-2.5">
          <p className="text-xs text-[rgb(var(--muted-foreground))]">
            <span className="font-medium text-[rgb(var(--foreground))]">
              {(pagination.page - 1) * pagination.perPage + 1}
            </span>
            {' - '}
            <span className="font-medium text-[rgb(var(--foreground))]">
              {Math.min(pagination.page * pagination.perPage, pagination.total)}
            </span>
            {' de '}
            <span className="font-medium text-[rgb(var(--foreground))]">
              {pagination.total}
            </span>
          </p>
          <div className="flex items-center gap-0.5">
            <PaginationButton onClick={() => pagination.onPageChange(1)} disabled={pagination.page <= 1}>
              <ChevronsLeft className="h-3.5 w-3.5" />
            </PaginationButton>
            <PaginationButton onClick={() => pagination.onPageChange(pagination.page - 1)} disabled={pagination.page <= 1}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </PaginationButton>
            <span className="px-2.5 text-xs font-medium text-[rgb(var(--foreground))]">
              {pagination.page} / {pagination.totalPages}
            </span>
            <PaginationButton onClick={() => pagination.onPageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>
              <ChevronRight className="h-3.5 w-3.5" />
            </PaginationButton>
            <PaginationButton onClick={() => pagination.onPageChange(pagination.totalPages)} disabled={pagination.page >= pagination.totalPages}>
              <ChevronsRight className="h-3.5 w-3.5" />
            </PaginationButton>
          </div>
        </div>
      )}
    </div>
  );
}

function PaginationButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-7 w-7 items-center justify-center rounded-md text-[rgb(var(--muted-foreground))] transition-colors duration-100 hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}
