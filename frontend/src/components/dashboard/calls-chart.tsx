'use client';

import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Phone, PhoneCall, TrendingDown } from 'lucide-react';

interface CallsChartProps {
  data: Array<{ date: string; ligacoes: number }>;
  totalLigacoes: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.[0]) return null;
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-3 shadow-xl">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-cyan-400">{payload[0].value} ligações</p>
    </div>
  );
}

export function CallsChart({ data, totalLigacoes }: CallsChartProps) {
  const media = Math.round(totalLigacoes / (data.length || 1));
  const ultimo = data[data.length - 1]?.ligacoes ?? 0;
  const penultimo = data[data.length - 2]?.ligacoes ?? 0;
  const tendencia = penultimo > 0 ? (((ultimo - penultimo) / penultimo) * 100).toFixed(0) : '0';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm"
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10">
            <Phone className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Ligações</h3>
            <p className="text-xs text-slate-400">Evolução diária</p>
          </div>
        </div>
      </div>

      {/* Mini KPIs */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-slate-700/30 p-3">
          <div className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-xs text-slate-400">Total</span>
          </div>
          <p className="mt-1 text-lg font-bold text-white">{totalLigacoes.toLocaleString('pt-BR')}</p>
        </div>
        <div className="rounded-xl bg-slate-700/30 p-3">
          <div className="flex items-center gap-1.5">
            <PhoneCall className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs text-slate-400">Média/dia</span>
          </div>
          <p className="mt-1 text-lg font-bold text-white">{media}</p>
        </div>
        <div className="rounded-xl bg-slate-700/30 p-3">
          <div className="flex items-center gap-1.5">
            <TrendingDown className="h-3.5 w-3.5 text-red-400" />
            <span className="text-xs text-slate-400">Tendência</span>
          </div>
          <p className="mt-1 text-lg font-bold text-red-400">{tendencia}%</p>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="callsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#475569' }}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#475569' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="ligacoes"
              stroke="#06b6d4"
              strokeWidth={2}
              fill="url(#callsGradient)"
              dot={{ fill: '#06b6d4', r: 4 }}
              activeDot={{ r: 6, fill: '#06b6d4' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
