'use client';

import { useState, useRef, useEffect } from 'react';
import { Database, Check, ChevronDown } from 'lucide-react';
import { useImportSource } from '@/contexts/import-source-context';

export function ImportSourceSelector() {
  const { sources, isLoading, selectedBatchIds, setSelectedBatchIds } = useImportSource();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading || sources.length === 0) return null;

  const allSelected = selectedBatchIds.length === 0;
  const label = allSelected
    ? 'Todas as fontes'
    : selectedBatchIds.length === 1
      ? sources.find(s => s.id === selectedBatchIds[0])?.source_name ?? 'Fonte'
      : `${selectedBatchIds.length} fontes`;

  function toggle(id: string) {
    if (selectedBatchIds.includes(id)) {
      setSelectedBatchIds(selectedBatchIds.filter(x => x !== id));
    } else {
      setSelectedBatchIds([...selectedBatchIds, id]);
    }
  }

  function selectAll() {
    setSelectedBatchIds([]);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2.5 py-1.5 text-[12px] font-medium text-[rgb(var(--foreground))] transition-colors hover:bg-[rgb(var(--muted))]"
      >
        <Database className="h-3.5 w-3.5 text-[rgb(var(--muted-foreground))]" />
        <span className="max-w-[140px] truncate">{label}</span>
        <ChevronDown className={`h-3 w-3 text-[rgb(var(--muted-foreground))] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[260px] rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-1 shadow-lg">
          {/* All sources option */}
          <button
            onClick={selectAll}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] transition-colors hover:bg-[rgb(var(--muted))]"
          >
            <div className={`flex h-4 w-4 items-center justify-center rounded border ${allSelected ? 'border-primary-500 bg-primary-500' : 'border-[rgb(var(--border))]'}`}>
              {allSelected && <Check className="h-3 w-3 text-white" />}
            </div>
            <span className="font-medium text-[rgb(var(--foreground))]">Todas as fontes</span>
          </button>

          <div className="my-1 h-px bg-[rgb(var(--border))]" />

          {sources.map(source => {
            const selected = selectedBatchIds.includes(source.id);
            const date = new Date(source.created_at).toLocaleDateString('pt-BR');
            return (
              <button
                key={source.id}
                onClick={() => toggle(source.id)}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] transition-colors hover:bg-[rgb(var(--muted))]"
              >
                <div className={`flex h-4 w-4 items-center justify-center rounded border ${selected ? 'border-primary-500 bg-primary-500' : 'border-[rgb(var(--border))]'}`}>
                  {selected && <Check className="h-3 w-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-[rgb(var(--foreground))] truncate">
                      {source.source_name || 'Import'}
                    </span>
                    <span className="text-[11px] text-[rgb(var(--muted-foreground))] shrink-0">
                      {date}
                    </span>
                  </div>
                  <div className="text-[11px] text-[rgb(var(--muted-foreground))]">
                    {source.processes_count} processos &middot; {source.units_count} unidades &middot; {source.clients_count} clientes
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
