'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, Search, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { useUnreadCount } from '@/hooks/use-notifications';
import { Avatar } from '@/components/ui/avatar';
import { CommandPalette } from '@/components/command-palette';
import Link from 'next/link';

const routeTitles: Record<string, { title: string; description: string }> = {
  '/dashboard': {
    title: 'Dashboard',
    description: 'Visão geral do seu negócio',
  },
  '/pipeline': {
    title: 'Pipeline',
    description: 'Acompanhe o fluxo de vendas',
  },
  '/processes': {
    title: 'Processos',
    description: 'Gestão de processos de revenda',
  },
  '/clients': {
    title: 'Clientes',
    description: 'Base de clientes e contatos',
  },
  '/units': {
    title: 'Unidades',
    description: 'Gestão de unidades imobiliárias',
  },
  '/documents': {
    title: 'Documentos',
    description: 'Central de documentos',
  },
  '/tasks': {
    title: 'Tarefas',
    description: 'Acompanhe suas tarefas e pendências',
  },
  '/agenda': {
    title: 'Agenda',
    description: 'Compromissos e eventos',
  },
  '/financial': {
    title: 'Financeiro',
    description: 'Relatórios financeiros por filial',
  },
  '/users': {
    title: 'Usuários',
    description: 'Gestão de usuários e permissões',
  },
  '/audit': {
    title: 'Auditoria',
    description: 'Logs de auditoria e segurança',
  },
  '/imports': {
    title: 'Importações',
    description: 'Upload e processamento de arquivos',
  },
  '/settings': {
    title: 'Configurações',
    description: 'Configurações do sistema',
  },
  '/notifications': {
    title: 'Notificações',
    description: 'Central de notificações',
  },
  '/profile': {
    title: 'Meu Perfil',
    description: 'Gerencie seus dados pessoais',
  },
};

function getRouteInfo(pathname: string) {
  if (routeTitles[pathname]) return routeTitles[pathname];
  for (const [route, info] of Object.entries(routeTitles)) {
    if (pathname.startsWith(route)) return info;
  }
  return { title: 'LYX', description: '' };
}

export function Header() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { title, description } = getRouteInfo(pathname);
  const { data: unreadData } = useUnreadCount();
  const [searchOpen, setSearchOpen] = useState(false);

  const unreadCount = unreadData?.count ?? 0;

  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? 'Bom dia'
      : now.getHours() < 18
        ? 'Boa tarde'
        : 'Boa noite';

  const isDashboard = pathname === '/dashboard';

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[rgb(var(--border))] bg-[rgb(var(--card))] px-6">
        <div>
          {isDashboard ? (
            <h2 className="text-[15px] font-semibold text-[rgb(var(--foreground))]">
              {greeting}, {user?.full_name?.split(' ')[0]}!
            </h2>
          ) : (
            <h2 className="text-[15px] font-semibold text-[rgb(var(--foreground))]">
              {title}
            </h2>
          )}
          <p className="text-[13px] text-[rgb(var(--muted-foreground))]">
            {description}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[rgb(var(--muted-foreground))] transition-colors duration-150 hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Theme */}
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[rgb(var(--muted-foreground))] transition-colors duration-150 hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
            title={resolvedTheme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          {/* Notifications */}
          <Link
            href="/notifications"
            className="relative flex h-8 w-8 items-center justify-center rounded-md text-[rgb(var(--muted-foreground))] transition-colors duration-150 hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          <div className="mx-2 h-5 w-px bg-[rgb(var(--border))]" />

          {/* User */}
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors duration-150 hover:bg-[rgb(var(--muted))]"
          >
            <Avatar name={user?.full_name ?? 'U'} size="sm" />
            <span className="text-[13px] font-medium text-[rgb(var(--foreground))]">
              {user?.full_name?.split(' ')[0]}
            </span>
          </Link>
        </div>
      </header>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
