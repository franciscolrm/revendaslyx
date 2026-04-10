'use client';

import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { useState } from 'react';

interface StatusChartProps {
  grouped: Array<{ name: string; value: number; color: string }>;
  detailed: Array<{ status: string; quantidade: number; color: string }>;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0];
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-3 shadow-xl">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: d.payload.color || d.payload.fill }} />
        <span className="text-sm font-medium text-white">{d.name || d.payload.name || d.payload.status}</span>
      </div>
      <p className="mt-1 text-lg font-bold text-white">{d.value}</p>
    </div>
  );
}

export function StatusChart({ grouped, detailed }: StatusChartProps) {
  const [view, setView] = useState<'donut' | 'bar'>('donut');
  const total = grouped.reduce((s, g) => s + g.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm"
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
            <PieIcon className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Distribuição por Status</h3>
            <p className="text-xs text-slate-400">{total} revendas total</p>
          </div>
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-700/50 p-1">
          <button
            onClick={() => setView('donut')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              view === 'donut' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Donut
          </button>
          <button
            onClick={() => setView('bar')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              view === 'bar' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Barras
          </button>
        </div>
      </div>

      {view === 'donut' ? (
        <div className="flex flex-col items-center gap-6 lg:flex-row">
          <div className="h-64 w-64 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={grouped}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {grouped.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid w-full grid-cols-2 gap-2">
            {grouped.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate text-xs text-slate-400">{item.name}</span>
                <span className="ml-auto text-xs font-semibold text-white">{item.value}</span>
                <span className="text-xs text-slate-500">
                  {((item.value / total) * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={detailed.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis
                dataKey="status"
                type="category"
                width={120}
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="quantidade" radius={[0, 6, 6, 0]}>
                {detailed.slice(0, 10).map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
