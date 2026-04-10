'use client';

import { Database } from 'lucide-react';
import { useSnapshotBatches } from '@/hooks/use-dashboard';

interface BatchSelectorProps {
  value?: string;
  onChange: (batchId: string | undefined) => void;
}

export function BatchSelector({ value, onChange }: BatchSelectorProps) {
  const { data: batches, isLoading } = useSnapshotBatches();

  if (isLoading || !batches?.length) return null;

  return (
    <div className="flex items-center gap-2">
      <Database className="h-4 w-4 text-[rgb(var(--muted-foreground))]" />
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="h-8 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2.5 text-[12px] text-[rgb(var(--foreground))] transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      >
        <option value="">Lote mais recente</option>
        {batches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.source_name} — {new Date(b.reference_date).toLocaleDateString('pt-BR')}
          </option>
        ))}
      </select>
    </div>
  );
}
