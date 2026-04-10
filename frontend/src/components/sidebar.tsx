'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
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
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/contexts/auth-context';
import { Avatar } from '@/components/ui/avatar';

// ── Nav data ────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Principal',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/pipeline', label: 'Pipeline', icon: Kanban },
    ],
  },
  {
    title: 'Operacional',
    items: [
      { href: '/processes', label: 'Processos', icon: GitBranch },
      { href: '/clients', label: 'Clientes', icon: Users },
      { href: '/units', label: 'Unidades', icon: Building2 },
      { href: '/documents', label: 'Documentos', icon: FileText },
    ],
  },
  {
    title: 'Produtividade',
    items: [
      { href: '/tasks', label: 'Tarefas', icon: CheckSquare },
      { href: '/agenda', label: 'Agenda', icon: Calendar },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { href: '/financial', label: 'Financeiro', icon: DollarSign },
    ],
  },
  {
    title: 'Administração',
    items: [
      { href: '/users', label: 'Usuários', icon: UserCog },
      { href: '/audit', label: 'Auditoria', icon: Shield },
      { href: '/imports', label: 'Importações', icon: Upload },
      { href: '/settings', label: 'Configurações', icon: Settings },
    ],
  },
];

const STORAGE_KEY = 'lyx-sidebar-collapsed';

// ── Tooltip ─────────────────────────────────────────────

function Tooltip({ children, label, show }: { children: React.ReactNode; label: string; show: boolean }) {
  if (!show) return <>{children}</>;
  return (
    <div className="group/tip relative">
      {children}
      <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 opacity-0 transition-opacity duration-150 group-hover/tip:opacity-100">
        <div className="whitespace-nowrap rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2.5 py-1.5 text-[12px] font-medium text-[rgb(var(--foreground))] shadow-lg">
          {label}
        </div>
      </div>
    </div>
  );
}

// ── Sidebar ─────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load persisted state
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'true') setCollapsed(true);
    } catch {}
    setMounted(true);
  }, []);

  // Persist state
  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  }

  const w = collapsed ? 'w-[68px]' : 'w-[260px]';

  // Prevent layout shift before hydration
  if (!mounted) {
    return <aside className="flex h-screen w-[260px] flex-col border-r border-[rgb(var(--sidebar-border))] bg-[rgb(var(--sidebar))]" />;
  }

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-[rgb(var(--sidebar-border))] bg-[rgb(var(--sidebar))] transition-all duration-300 ease-in-out',
        w,
      )}
    >
      {/* Logo + Toggle */}
      <div className={cn('flex h-14 shrink-0 items-center', collapsed ? 'flex-col justify-center gap-1 px-2 pt-1' : 'justify-between px-4')}>
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-600">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <span className="text-[15px] font-semibold text-[rgb(var(--foreground))]">
              LYX
            </span>
          )}
        </Link>
        <button
          onClick={toggle}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[rgb(var(--muted-foreground))] transition-colors duration-150 hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className={cn('flex-1 overflow-y-auto pb-4', collapsed ? 'space-y-2 px-2 pt-1' : 'space-y-5 px-3 pt-2')}>
        {navSections.map((section) => (
          <div key={section.title}>
            {/* Section title */}
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
                {section.title}
              </p>
            )}
            {collapsed && (
              <div className="mx-auto mb-1 mt-1 h-px w-6 bg-[rgb(var(--border))]" />
            )}

            <div className={cn(collapsed ? 'space-y-1' : 'space-y-0.5')}>
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                const linkContent = (
                  <Link
                    href={item.href}
                    className={cn(
                      'group flex items-center rounded-lg transition-colors duration-150',
                      collapsed
                        ? cn('justify-center p-2.5', isActive ? 'bg-primary-50 dark:bg-primary-500/10' : 'hover:bg-[rgb(var(--muted))]')
                        : cn('gap-3 px-3 py-[9px] text-[13px] font-medium', isActive ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400' : 'text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]'),
                    )}
                  >
                    <item.icon
                      className={cn(
                        'shrink-0 transition-colors',
                        collapsed ? 'h-[20px] w-[20px]' : 'h-[18px] w-[18px]',
                        isActive
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-[rgb(var(--muted-foreground))]/70 group-hover:text-[rgb(var(--muted-foreground))]',
                      )}
                    />
                    {!collapsed && (
                      <span className="flex-1 truncate">{item.label}</span>
                    )}
                  </Link>
                );

                return (
                  <Tooltip key={item.href} label={item.label} show={collapsed}>
                    {linkContent}
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-[rgb(var(--sidebar-border))] p-2">
        {collapsed ? (
          <>
            <Tooltip label={user?.full_name ?? 'Perfil'} show>
              <Link
                href="/profile"
                className="flex justify-center rounded-lg p-2 transition-colors duration-150 hover:bg-[rgb(var(--muted))]"
              >
                <Avatar name={user?.full_name ?? 'U'} size="sm" />
              </Link>
            </Tooltip>
            <Tooltip label="Sair" show>
              <button
                onClick={signOut}
                className="mt-1 flex w-full justify-center rounded-lg p-2 text-[rgb(var(--muted-foreground))] transition-colors duration-150 hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </Tooltip>
          </>
        ) : (
          <>
            <Link
              href="/profile"
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-[rgb(var(--muted))]"
            >
              <Avatar name={user?.full_name ?? 'U'} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-[rgb(var(--foreground))]">
                  {user?.full_name}
                </p>
                <p className="truncate text-[11px] text-[rgb(var(--muted-foreground))]">
                  {user?.email}
                </p>
              </div>
            </Link>
            <button
              onClick={signOut}
              className="mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-4 py-2 text-[13px] text-[rgb(var(--muted-foreground))] transition-colors duration-150 hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
