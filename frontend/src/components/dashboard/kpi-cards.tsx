'use client';

import { motion } from 'framer-motion';
import {
  Building2,
  Activity,
  ShoppingBag,
  Percent,
  Phone,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  variacao: number;
  icon: LucideIcon;
  color: string;
  delay?: number;
}

function KpiCard({ label, value, variacao, icon: Icon, color, delay = 0 }: KpiCardProps) {
  const isPositive = variacao > 0;
  const isNegative = variacao < 0;
  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="group relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5 backdrop-blur-sm transition-all duration-300 hover:border-slate-600/50 hover:bg-slate-800/80 hover:shadow-lg hover:shadow-black/20"
    >
      {/* Glow effect */}
      <div
        className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-10 blur-2xl transition-opacity group-hover:opacity-20"
        style={{ backgroundColor: color }}
      />

      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          <div className="mt-2 flex items-center gap-1">
            <TrendIcon
              className={`h-3.5 w-3.5 ${
                isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-slate-500'
              }`}
            />
            <span
              className={`text-xs font-medium ${
                isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-slate-500'
              }`}
            >
              {variacao > 0 ? '+' : ''}{variacao}%
            </span>
            <span className="text-xs text-slate-500">vs ontem</span>
          </div>
        </div>
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
}

interface KpiCardsProps {
  data: {
    totalResales: number;
    resalesAtivas: number;
    resalesVendidas: number;
    taxaConversao: number;
    totalLigacoes: number;
    performanceDia: number;
    variacao: {
      totalResales: number;
      resalesAtivas: number;
      resalesVendidas: number;
      taxaConversao: number;
      totalLigacoes: number;
      performanceDia: number;
    };
  };
}

export function KpiCards({ data }: KpiCardsProps) {
  const cards = [
    {
      label: 'Total de Revendas',
      value: data.totalResales.toLocaleString('pt-BR'),
      variacao: data.variacao.totalResales,
      icon: Building2,
      color: '#3b82f6',
    },
    {
      label: 'Revendas Ativas',
      value: data.resalesAtivas.toLocaleString('pt-BR'),
      variacao: data.variacao.resalesAtivas,
      icon: Activity,
      color: '#8b5cf6',
    },
    {
      label: 'Revendas Vendidas',
      value: data.resalesVendidas.toLocaleString('pt-BR'),
      variacao: data.variacao.resalesVendidas,
      icon: ShoppingBag,
      color: '#10b981',
    },
    {
      label: 'Taxa de Conversão',
      value: `${data.taxaConversao}%`,
      variacao: data.variacao.taxaConversao,
      icon: Percent,
      color: '#f59e0b',
    },
    {
      label: 'Total de Ligações',
      value: data.totalLigacoes.toLocaleString('pt-BR'),
      variacao: data.variacao.totalLigacoes,
      icon: Phone,
      color: '#06b6d4',
    },
    {
      label: 'Performance do Dia',
      value: data.performanceDia.toLocaleString('pt-BR'),
      variacao: data.variacao.performanceDia,
      icon: Zap,
      color: '#f43f5e',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((card, i) => (
        <KpiCard key={card.label} {...card} delay={i * 0.1} />
      ))}
    </div>
  );
}
