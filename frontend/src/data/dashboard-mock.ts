// ─────────────────────────────────────────────────
// Mock data mapeado dos CSVs:
//   - Jersey (status diário + ligações)
//   - Reno (composição financeira)
// ─────────────────────────────────────────────────

// ── Jersey: evolução temporal por data ──
export const timelineData = [
  { date: '30/03', total: 423, vendidas: 10, angariacao: 49, renegociacao: 74, emContato: 13 },
  { date: '31/03', total: 423, vendidas: 10, angariacao: 50, renegociacao: 74, emContato: 13 },
  { date: '01/04', total: 423, vendidas: 10, angariacao: 50, renegociacao: 75, emContato: 13 },
  { date: '02/04', total: 423, vendidas: 10, angariacao: 50, renegociacao: 104, emContato: 8 },
  { date: '06/04', total: 423, vendidas: 10, angariacao: 49, renegociacao: 104, emContato: 8 },
  { date: '07/04', total: 423, vendidas: 10, angariacao: 46, renegociacao: 105, emContato: 8 },
  { date: '08/04', total: 423, vendidas: 10, angariacao: 47, renegociacao: 108, emContato: 4 },
];

// ── Jersey: distribuição por status (data mais recente - 08/04) ──
export const statusDistribution = [
  { status: 'Angariação', quantidade: 47, ligacoes: 0, color: '#3b82f6' },
  { status: 'Vendida', quantidade: 10, ligacoes: 0, color: '#10b981' },
  { status: 'Liberada p/ Venda', quantidade: 29, ligacoes: 0, color: '#6366f1' },
  { status: 'Agendada Cartório', quantidade: 6, ligacoes: 0, color: '#f59e0b' },
  { status: 'Em agendamento', quantidade: 2, ligacoes: 0, color: '#f97316' },
  { status: 'Em contato', quantidade: 4, ligacoes: 0, color: '#8b5cf6' },
  { status: 'Renegociação', quantidade: 108, ligacoes: 0, color: '#ef4444' },
  { status: 'Env. Agência - Pgto Total', quantidade: 7, ligacoes: 0, color: '#14b8a6' },
  { status: 'Env. Agência - Pgto Parcial', quantidade: 12, ligacoes: 0, color: '#06b6d4' },
  { status: 'Env. Agência - Sem Neg.', quantidade: 9, ligacoes: 0, color: '#84cc16' },
  { status: 'Agendado Caixa', quantidade: 5, ligacoes: 0, color: '#a855f7' },
  { status: 'Aguardando retorno', quantidade: 60, ligacoes: 0, color: '#64748b' },
  { status: 'Sem retorno', quantidade: 12, ligacoes: 0, color: '#94a3b8' },
  { status: 'Sem interesse', quantidade: 2, ligacoes: 0, color: '#cbd5e1' },
  { status: 'Sem condições', quantidade: 1, ligacoes: 0, color: '#e2e8f0' },
  { status: 'Sem interesse (geral)', quantidade: 9, ligacoes: 0, color: '#fb923c' },
  { status: 'Sem retorno/Contato', quantidade: 181, ligacoes: 0, color: '#f43f5e' },
  { status: 'Número Inválido', quantidade: 50, ligacoes: 0, color: '#e11d48' },
  { status: 'Jurídico', quantidade: 1, ligacoes: 0, color: '#7c3aed' },
  { status: 'Sem retorno comercial', quantidade: 23, ligacoes: 0, color: '#475569' },
];

// ── Agrupamento simplificado para donut chart ──
export const statusGrouped = [
  { name: 'Angariação', value: 47, color: '#3b82f6' },
  { name: 'Vendida', value: 10, color: '#10b981' },
  { name: 'Lib. p/ Venda', value: 29, color: '#6366f1' },
  { name: 'Cartório', value: 8, color: '#f59e0b' },
  { name: 'Em contato', value: 4, color: '#8b5cf6' },
  { name: 'Renegociação', value: 108, color: '#ef4444' },
  { name: 'Enviado Agência', value: 28, color: '#14b8a6' },
  { name: 'Aguardando', value: 72, color: '#64748b' },
  { name: 'Sem retorno', value: 204, color: '#f43f5e' },
  { name: 'Outros', value: 60, color: '#475569' },
];

// ── Jersey: evolução de ligações por data ──
export const callsTimeline = [
  { date: '30/03', ligacoes: 579 },
  { date: '31/03', ligacoes: 579 },
  { date: '01/04', ligacoes: 272 },
  { date: '02/04', ligacoes: 308 },
  { date: '06/04', ligacoes: 27 },
  { date: '07/04', ligacoes: 3 },
  { date: '08/04', ligacoes: 0 },
];

// ── KPIs principais ──
export const kpiData = {
  totalResales: 423,
  resalesAtivas: 283,
  resalesVendidas: 10,
  taxaConversao: 2.4,
  totalLigacoes: 1768,
  performanceDia: 0,
  variacao: {
    totalResales: 0,
    resalesAtivas: -1.2,
    resalesVendidas: 0,
    taxaConversao: 0,
    totalLigacoes: -100,
    performanceDia: -100,
  },
};

// ── Reno: composição financeira (mapeamento CSV → financial_components) ──
export const financialComponents = [
  { code: 'financiamento', name: 'Financiamento', type: 'receita', icon: 'Banknote' },
  { code: 'subsidio', name: 'Subsídio', type: 'receita', icon: 'HandCoins' },
  { code: 'fgts', name: 'FGTS', type: 'receita', icon: 'Landmark' },
  { code: 'endividamento', name: 'Endividamento Lyx', type: 'despesa', icon: 'TrendingDown' },
  { code: 'jdo', name: 'JDO (Plan CEF)', type: 'despesa', icon: 'FileText' },
  { code: 'documentacao', name: 'Documentação', type: 'despesa', icon: 'FileCheck' },
  { code: 'laudo', name: 'Laudo', type: 'despesa', icon: 'ClipboardCheck' },
  { code: 'iptu', name: 'IPTU', type: 'despesa', icon: 'Building2' },
  { code: 'comissao', name: 'Comissão (6,5%)', type: 'despesa', icon: 'Percent' },
];

// ── Mock financeiro por revenda ──
export const financialSummary = {
  valorTotalRevendas: 8_460_000,
  ticketMedio: 200_000,
  comissaoTotal: 549_900,
  totalReceitas: 6_345_000,
  totalDespesas: 2_115_000,
  resultadoLiquido: 4_230_000,
  componentes: [
    { name: 'Financiamento', value: 4_230_000, type: 'receita' },
    { name: 'Subsídio', value: 1_269_000, type: 'receita' },
    { name: 'FGTS', value: 846_000, type: 'receita' },
    { name: 'Endividamento', value: 634_500, type: 'despesa' },
    { name: 'JDO', value: 423_000, type: 'despesa' },
    { name: 'Documentação', value: 211_500, type: 'despesa' },
    { name: 'Laudo', value: 84_600, type: 'despesa' },
    { name: 'IPTU', value: 211_500, type: 'despesa' },
    { name: 'Comissão', value: 549_900, type: 'despesa' },
  ],
};

// ── Ranking de performance (mock) ──
export const rankingData = [
  { position: 1, name: 'Carlos Silva', region: 'Jersey', vendas: 4, conversao: 8.5, ligacoes: 312, avatar: 'CS' },
  { position: 2, name: 'Ana Oliveira', region: 'Jersey', vendas: 3, conversao: 6.2, ligacoes: 287, avatar: 'AO' },
  { position: 3, name: 'Pedro Santos', region: 'Reno', vendas: 2, conversao: 4.8, ligacoes: 256, avatar: 'PS' },
  { position: 4, name: 'Maria Costa', region: 'Jersey', vendas: 1, conversao: 3.1, ligacoes: 198, avatar: 'MC' },
  { position: 5, name: 'João Ferreira', region: 'Reno', vendas: 0, conversao: 0, ligacoes: 165, avatar: 'JF' },
  { position: 6, name: 'Lucia Mendes', region: 'Jersey', vendas: 0, conversao: 0, ligacoes: 145, avatar: 'LM' },
  { position: 7, name: 'Rafael Lima', region: 'Reno', vendas: 0, conversao: 0, ligacoes: 105, avatar: 'RL' },
];

// ── Regiões para mapa ──
export const regionsData = [
  { id: 'jersey', name: 'Jersey', lat: -23.55, lng: -46.63, total: 423, vendidas: 10, conversao: 2.4 },
  { id: 'reno', name: 'Reno', lat: -22.91, lng: -43.17, total: 156, vendidas: 8, conversao: 5.1 },
];

// ── Mapeamento CSV Jersey → Sistema ──
export const jerseyStatusMapping: Record<string, string> = {
  '01. Angariação': '01_angariacao',
  '01. Vendida': '01_vendida',
  '02. Liberada pra Venda': '02_liberada_pra_venda',
  '03. Agendada - Cartório': '03_agendada_cartorio',
  '04. Em agendamento - Cartório': '04_em_agendamento_cartorio',
  '01.1 Em contato': '01_em_contato',
  '02. Renegociação': '02_renegociacao',
  '01.1 Enviado a Agência - Pgto Total': '01_enviado_agencia_pgto_total',
  '01.2 Enviado a Agência - Pgto parcial': '01_enviado_agencia_pgto_parcial',
  '01.3 Enviado a Agência - Sem negociação': '01_enviado_agencia_sem_negociacao',
  '02. Agendado - Caixa': '02_agendado_caixa',
  '03. Aguardando retorno': '03_aguardando_retorno',
  '04. Sem retorno': '04_sem_retorno',
  '05. Sem interesse': '05_sem_interesse',
  '06. Sem condições': '06_sem_condicoes',
  '03. Sem interesse': '03_sem_interesse',
  '04. Sem retorno/Contato': '04_sem_retorno_contato',
  '05. Numero Inválido': '05_numero_invalido',
  'Juridico': 'juridico',
  'Sem retorno comercial': 'sem_retorno_comercial',
};

// ── Mapeamento CSV Reno → Financial Components ──
export const renoFinancialMapping: Record<string, string> = {
  'Valor de financimento': 'financiamento',
  'Valor de subsidio': 'subsidio',
  'Valor de FGTS': 'fgts',
  'Quanto ainda deve do endividamento Lyx': 'endividamento',
  'Quanto deve de JDO (baseado na plan CEF)': 'jdo',
  'Documentação': 'documentacao',
  'Laudo': 'laudo',
  'IPTU da unidade': 'iptu',
  'Comissão de 6,5%': 'comissao',
};
