'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutDashboard,
  Kanban,
  GitBranch,
  Users,
  Building2,
  FileText,
  CheckSquare,
  Calendar,
  DollarSign,
  UserCog,
  Shield,
  Upload,
  Settings,
  Bell,
  User,
  ArrowRight,
  Plus,
  Command,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { searchItems, type SearchItem } from '@/lib/search-data';

const categoryIcons: Record<string, React.ElementType> = {
  Dashboard: LayoutDashboard,
  Pipeline: Kanban,
  Processos: GitBranch,
  Clientes: Users,
  Unidades: Building2,
  Documentos: FileText,
  Tarefas: CheckSquare,
  Agenda: Calendar,
  Financeiro: DollarSign,
  'Usuários': UserCog,
  Auditoria: Shield,
  'Importações': Upload,
  'Configurações': Settings,
  'Notificações': Bell,
  'Meu Perfil': User,
  'Novo Processo': Plus,
  'Novo Cliente': Plus,
  'Nova Unidade': Plus,
  'Novo Usuário': Plus,
};

function getItemIcon(item: SearchItem) {
  return categoryIcons[item.label] ?? ArrowRight;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const results = useMemo(() => searchItems(query), [query]);

  const grouped = useMemo(() => {
    const groups: Record<string, SearchItem[]> = {};
    for (const item of results) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [results]);

  const flatResults = useMemo(() => {
    const flat: SearchItem[] = [];
    for (const items of Object.values(grouped)) flat.push(...items);
    return flat;
  }, [grouped]);

  const navigate = useCallback(
    (item: SearchItem) => {
      onClose();
      setQuery('');
      setSelectedIndex(0);
      router.push(item.href);
    },
    [router, onClose],
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
      else if (e.key === 'Enter' && flatResults[selectedIndex]) { e.preventDefault(); navigate(flatResults[selectedIndex]); }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, flatResults, selectedIndex, navigate]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  let flatIndex = 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-2xl">
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-[rgb(var(--border))] px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-[rgb(var(--muted-foreground))]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Buscar páginas, clientes, processos..."
            className="flex-1 bg-transparent text-[13px] text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--muted-foreground))] focus:outline-none"
          />
          <kbd className="hidden rounded border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-1.5 py-0.5 text-[10px] text-[rgb(var(--muted-foreground))] sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-1.5">
          {!query.trim() ? (
            <div className="px-3 py-10 text-center">
              <Command className="mx-auto h-7 w-7 text-[rgb(var(--muted-foreground))]/40" />
              <p className="mt-3 text-[13px] text-[rgb(var(--muted-foreground))]">
                Digite para buscar páginas e recursos
              </p>
            </div>
          ) : flatResults.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <Search className="mx-auto h-7 w-7 text-[rgb(var(--muted-foreground))]/40" />
              <p className="mt-3 text-[13px] text-[rgb(var(--muted-foreground))]">
                Nenhum resultado para &ldquo;{query}&rdquo;
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category} className="mb-1">
                <p className="mb-0.5 px-3 pt-2 text-[10px] font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
                  {category}
                </p>
                {items.map((item) => {
                  const currentIndex = flatIndex++;
                  const isSelected = currentIndex === selectedIndex;
                  const Icon = getItemIcon(item);

                  return (
                    <button
                      key={item.id}
                      data-index={currentIndex}
                      onClick={() => navigate(item)}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-100',
                        isSelected
                          ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400'
                          : 'text-[rgb(var(--foreground))] hover:bg-[rgb(var(--muted))]',
                      )}
                    >
                      <div className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                        isSelected
                          ? 'bg-primary-100 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400'
                          : 'bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))]',
                      )}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{item.label}</p>
                        {item.description && (
                          <p className="truncate text-[11px] text-[rgb(var(--muted-foreground))]">{item.description}</p>
                        )}
                      </div>
                      {isSelected && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary-500" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {flatResults.length > 0 && (
          <div className="flex items-center gap-4 border-t border-[rgb(var(--border))] px-4 py-2 text-[11px] text-[rgb(var(--muted-foreground))]">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-[rgb(var(--border))] px-1">&uarr;</kbd>
              <kbd className="rounded border border-[rgb(var(--border))] px-1">&darr;</kbd>
              navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-[rgb(var(--border))] px-1.5">Enter</kbd>
              abrir
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
