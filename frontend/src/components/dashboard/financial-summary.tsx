'use client';

import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

interface FinancialSummaryProps {
  data: {
    valorTotalRevendas: number;
    ticketMedio: number;
    comissaoTotal: number;
    totalReceitas: number;
    totalDespesas: number;
    resultadoLiquido: number;
    componentes: Array<{ name: string; value: number; type: string }>;
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-3 shadow-xl">
      <p className="text-sm font-medium text-white">{d.name}</p>
      <p className={`mt-1 text-lg font-bold ${d.type === 'receita' ? 'text-emerald-400' : 'text-red-400'}`}>
        {formatCurrency(d.value)}
      </p>
      <p className="text-xs text-slate-400">{d.type === 'receita' ? 'Receita' : 'Despesa'}</p>
    </div>
  );
}

export function FinancialSummary({ data }: FinancialSummaryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.7 }}
      className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm"
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
            <DollarSign className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Financeiro</h3>
            <p className="text-xs text-slate-400">Composição de valores (Reno/Lyx)</p>
          </div>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-xl bg-slate-700/30 p-3">
          <div className="flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs text-slate-400">VGV Total</span>
          </div>
          <p className="mt-1 text-base font-bold text-white">{formatCurrency(data.valorTotalRevendas)}</p>
        </div>
        <div className="rounded-xl bg-slate-700/30 p-3">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs text-slate-400">Receitas</span>
          </div>
          <p className="mt-1 text-base font-bold text-emerald-400">{formatCurrency(data.totalReceitas)}</p>
        </div>
        <div className="rounded-xl bg-slate-700/30 p-3">
          <div className="flex items-center gap-1.5">
            <TrendingDown className="h-3.5 w-3.5 text-red-400" />
            <span className="text-xs text-slate-400">Despesas</span>
          </div>
          <p className="mt-1 text-base font-bold text-red-400">{formatCurrency(data.totalDespesas)}</p>
        </div>
        <div className="rounded-xl bg-slate-700/30 p-3">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs text-slate-400">Ticket Médio</span>
          </div>
          <p className="mt-1 text-base font-bold text-white">{formatCurrency(data.ticketMedio)}</p>
        </div>
        <div className="rounded-xl bg-slate-700/30 p-3">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-xs text-slate-400">Comissão Total</span>
          </div>
          <p className="mt-1 text-base font-bold text-purple-400">{formatCurrency(data.comissaoTotal)}</p>
        </div>
        <div className="rounded-xl bg-slate-700/30 p-3">
          <div className="flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-xs text-slate-400">Resultado Líquido</span>
          </div>
          <p className="mt-1 text-base font-bold text-cyan-400">{formatCurrency(data.resultadoLiquido)}</p>
        </div>
      </div>

      {/* Bar chart of components */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.componentes}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={{ stroke: '#475569' }}
              angle={-35}
              textAnchor="end"
              height={60}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#475569' }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {data.componentes.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.type === 'receita' ? '#10b981' : '#ef4444'}
                  opacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
