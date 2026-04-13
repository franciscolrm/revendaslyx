'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface ImportSource {
  id: string;
  source_name: string;
  import_type: string;
  status: string;
  total_rows: number;
  valid_rows: number;
  created_at: string;
  finished_at: string | null;
  file: { file_name: string } | null;
  clients_count: number;
  units_count: number;
  processes_count: number;
}

interface ImportSourceContextType {
  sources: ImportSource[];
  isLoading: boolean;
  selectedBatchIds: string[];
  setSelectedBatchIds: (ids: string[]) => void;
  /** Comma-separated string for API query params, or undefined if "all" */
  filterParam: string | undefined;
}

const ImportSourceContext = createContext<ImportSourceContextType | null>(null);

export function ImportSourceProvider({ children }: { children: ReactNode }) {
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);

  const { data: sources = [], isLoading } = useQuery<ImportSource[]>({
    queryKey: ['imports', 'sources'],
    queryFn: () => api.get('/imports/sources').then(r => r.data),
    staleTime: 60_000,
  });

  // Empty selection = show all (no filter)
  const filterParam = selectedBatchIds.length > 0
    ? selectedBatchIds.join(',')
    : undefined;

  return (
    <ImportSourceContext.Provider value={{
      sources,
      isLoading,
      selectedBatchIds,
      setSelectedBatchIds,
      filterParam,
    }}>
      {children}
    </ImportSourceContext.Provider>
  );
}

export function useImportSource() {
  const ctx = useContext(ImportSourceContext);
  if (!ctx) throw new Error('useImportSource must be used within ImportSourceProvider');
  return ctx;
}
