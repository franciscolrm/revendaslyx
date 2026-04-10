'use client';

import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, ChevronUp } from 'lucide-react';

interface RankingItem {
  position: number;
  name: string;
  region: string;
  vendas: number;
  conversao: number;
  ligacoes: number;
  avatar: string;
}

interface RankingTableProps {
  data: RankingItem[];
}

function getPositionStyle(pos: number) {
  switch (pos) {
    case 1:
      return { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: Crown };
    case 2:
      return { bg: 'bg-slate-400/10', text: 'text-slate-300', icon: Medal };
    case 3:
      return { bg: 'bg-orange-500/10', text: 'text-orange-400', icon: Medal };
    default:
      return { bg: 'bg-slate-700/30', text: 'text-slate-500', icon: ChevronUp };
  }
}

export function RankingTable({ data }: RankingTableProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
          <Trophy className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">Ranking de Performance</h3>
          <p className="text-xs text-slate-400">Top revendedores</p>
        </div>
      </div>

      <div className="space-y-2">
        {data.map((item, i) => {
          const style = getPositionStyle(item.position);
          const PositionIcon = style.icon;

          return (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 * i }}
              className="flex items-center gap-4 rounded-xl bg-slate-700/20 p-3 transition-colors hover:bg-slate-700/40"
            >
              {/* Position */}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.bg}`}
              >
                {item.position <= 3 ? (
                  <PositionIcon className={`h-4 w-4 ${style.text}`} />
                ) : (
                  <span className={`text-sm font-bold ${style.text}`}>{item.position}</span>
                )}
              </div>

              {/* Avatar + Name */}
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-bold text-white">
                  {item.avatar}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{item.name}</p>
                  <p className="text-xs text-slate-400">{item.region}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="hidden gap-6 sm:flex">
                <div className="text-right">
                  <p className="text-xs text-slate-400">Vendas</p>
                  <p className="text-sm font-bold text-emerald-400">{item.vendas}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Conversão</p>
                  <p className="text-sm font-bold text-blue-400">{item.conversao}%</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Ligações</p>
                  <p className="text-sm font-bold text-cyan-400">{item.ligacoes}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
