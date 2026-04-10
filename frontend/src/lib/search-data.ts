/**
 * Dados de busca global.
 * Os itens estáticos (páginas/módulos) ficam aqui.
 * Itens dinâmicos (clientes, processos, etc.) serão buscados via API futuramente.
 */

export interface SearchItem {
  id: string;
  label: string;
  category: string;
  description?: string;
  href: string;
  icon?: string;
  keywords: string[];
}

/** Páginas e módulos fixos do sistema */
export const staticSearchItems: SearchItem[] = [
  // Principal
  {
    id: 'page-dashboard',
    label: 'Dashboard',
    category: 'Páginas',
    description: 'Visão geral do negócio',
    href: '/dashboard',
    keywords: ['dashboard', 'inicio', 'home', 'painel', 'kpi', 'metricas'],
  },
  {
    id: 'page-pipeline',
    label: 'Pipeline',
    category: 'Páginas',
    description: 'Kanban de processos',
    href: '/pipeline',
    keywords: ['pipeline', 'kanban', 'funil', 'etapas', 'fluxo'],
  },
  // Operacional
  {
    id: 'page-processes',
    label: 'Processos',
    category: 'Páginas',
    description: 'Gestão de processos de revenda',
    href: '/processes',
    keywords: ['processos', 'revenda', 'fluxo', 'etapa', 'processo'],
  },
  {
    id: 'page-processes-new',
    label: 'Novo Processo',
    category: 'Ações',
    description: 'Criar novo processo de revenda',
    href: '/processes/new',
    keywords: ['novo', 'criar', 'processo', 'adicionar'],
  },
  {
    id: 'page-clients',
    label: 'Clientes',
    category: 'Páginas',
    description: 'Base de clientes e contatos',
    href: '/clients',
    keywords: ['clientes', 'compradores', 'vendedores', 'contatos', 'pessoas'],
  },
  {
    id: 'page-clients-new',
    label: 'Novo Cliente',
    category: 'Ações',
    description: 'Cadastrar novo cliente',
    href: '/clients/new',
    keywords: ['novo', 'criar', 'cliente', 'cadastrar', 'adicionar'],
  },
  {
    id: 'page-units',
    label: 'Unidades',
    category: 'Páginas',
    description: 'Gestão de unidades imobiliárias',
    href: '/units',
    keywords: ['unidades', 'imoveis', 'apartamento', 'casa', 'terreno', 'estoque'],
  },
  {
    id: 'page-units-new',
    label: 'Nova Unidade',
    category: 'Ações',
    description: 'Cadastrar nova unidade',
    href: '/units/new',
    keywords: ['nova', 'criar', 'unidade', 'cadastrar', 'adicionar', 'imovel'],
  },
  {
    id: 'page-documents',
    label: 'Documentos',
    category: 'Páginas',
    description: 'Central de documentos',
    href: '/documents',
    keywords: ['documentos', 'arquivos', 'upload', 'contrato', 'procuracao'],
  },
  // Produtividade
  {
    id: 'page-tasks',
    label: 'Tarefas',
    category: 'Páginas',
    description: 'Acompanhe suas tarefas e pendências',
    href: '/tasks',
    keywords: ['tarefas', 'todo', 'pendencias', 'atividades', 'checklist'],
  },
  {
    id: 'page-agenda',
    label: 'Agenda',
    category: 'Páginas',
    description: 'Compromissos e eventos',
    href: '/agenda',
    keywords: ['agenda', 'calendario', 'eventos', 'compromissos', 'reuniao'],
  },
  // Financeiro
  {
    id: 'page-financial',
    label: 'Financeiro',
    category: 'Páginas',
    description: 'Relatórios financeiros',
    href: '/financial',
    keywords: ['financeiro', 'dinheiro', 'receita', 'despesa', 'comissao', 'valor'],
  },
  // Administração
  {
    id: 'page-users',
    label: 'Usuários',
    category: 'Administração',
    description: 'Gestão de usuários e permissões',
    href: '/users',
    keywords: ['usuarios', 'permissoes', 'roles', 'equipe', 'colaboradores'],
  },
  {
    id: 'page-users-new',
    label: 'Novo Usuário',
    category: 'Ações',
    description: 'Criar novo usuário',
    href: '/users/new',
    keywords: ['novo', 'criar', 'usuario', 'cadastrar', 'adicionar'],
  },
  {
    id: 'page-audit',
    label: 'Auditoria',
    category: 'Administração',
    description: 'Logs de auditoria',
    href: '/audit',
    keywords: ['auditoria', 'logs', 'historico', 'seguranca', 'rastreamento'],
  },
  {
    id: 'page-imports',
    label: 'Importações',
    category: 'Administração',
    description: 'Upload e processamento de arquivos',
    href: '/imports',
    keywords: ['importacao', 'upload', 'csv', 'arquivo', 'planilha'],
  },
  {
    id: 'page-settings',
    label: 'Configurações',
    category: 'Administração',
    description: 'Configurações do sistema',
    href: '/settings',
    keywords: ['configuracoes', 'ajustes', 'preferencias', 'sistema'],
  },
  {
    id: 'page-notifications',
    label: 'Notificações',
    category: 'Páginas',
    description: 'Central de notificações',
    href: '/notifications',
    keywords: ['notificacoes', 'alertas', 'avisos', 'sino'],
  },
  {
    id: 'page-profile',
    label: 'Meu Perfil',
    category: 'Páginas',
    description: 'Gerencie seus dados pessoais',
    href: '/profile',
    keywords: ['perfil', 'conta', 'meus dados', 'senha', 'foto'],
  },
];

/**
 * Busca nos itens estáticos por query.
 * Futuramente, aqui entrará a chamada para API de busca global.
 */
export function searchItems(query: string): SearchItem[] {
  if (!query.trim()) return [];

  const q = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return staticSearchItems
    .map((item) => {
      const labelNorm = item.label
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const descNorm = (item.description ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      // Score: exact label match > label contains > keyword match > description match
      let score = 0;
      if (labelNorm === q) score = 100;
      else if (labelNorm.startsWith(q)) score = 80;
      else if (labelNorm.includes(q)) score = 60;
      else if (item.keywords.some((k) => k.includes(q))) score = 40;
      else if (descNorm.includes(q)) score = 20;

      return { item, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.item);
}
