'use client';

import { motion } from 'framer-motion';
import { MapPin, Navigation } from 'lucide-react';
import { useState } from 'react';

interface Region {
  id: string;
  name: string;
  lat: number;
  lng: number;
  total: number;
  vendidas: number;
  conversao: number;
}

interface MapChartProps {
  regions: Region[];
}

// SVG simplified Brazil map outline
const BRAZIL_PATH =
  'M280,20 C300,15 320,25 340,20 L360,30 L380,25 L400,35 L420,30 L440,40 L450,55 L460,70 L465,90 L470,110 L475,130 L480,150 L478,170 L475,190 L470,210 L465,230 L460,250 L450,270 L440,285 L425,300 L410,310 L395,320 L380,330 L360,340 L340,345 L320,350 L300,348 L280,340 L260,330 L240,315 L225,300 L210,280 L200,260 L195,240 L190,220 L188,200 L185,180 L188,160 L190,140 L195,120 L200,100 L210,80 L220,65 L235,50 L250,35 L265,25 Z';

// Approximate pin positions on the SVG (normalized)
function getRegionPosition(region: Region): { x: number; y: number } {
  const positions: Record<string, { x: number; y: number }> = {
    jersey: { x: 420, y: 180 },
    reno: { x: 440, y: 210 },
  };
  return positions[region.id] ?? { x: 330, y: 200 };
}

export function MapChart({ regions }: MapChartProps) {
  const [activeRegion, setActiveRegion] = useState<Region | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="relative rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10">
          <Navigation className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">Mapa de Operações</h3>
          <p className="text-xs text-slate-400">{regions.length} regiões ativas</p>
        </div>
      </div>

      <div className="relative flex items-center justify-center">
        <svg
          viewBox="150 0 380 380"
          className="h-72 w-full max-w-md"
        >
          {/* Brazil outline */}
          <path
            d={BRAZIL_PATH}
            fill="#1e293b"
            stroke="#334155"
            strokeWidth="2"
          />

          {/* Heatmap glow for regions */}
          {regions.map((region) => {
            const pos = getRegionPosition(region);
            const intensity = Math.min(region.total / 500, 1);
            return (
              <g key={region.id}>
                {/* Glow */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={30 + intensity * 20}
                  fill={region.conversao > 4 ? '#10b981' : '#3b82f6'}
                  opacity={0.15}
                />
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={15 + intensity * 10}
                  fill={region.conversao > 4 ? '#10b981' : '#3b82f6'}
                  opacity={0.3}
                />
                {/* Pin */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={8}
                  fill={region.conversao > 4 ? '#10b981' : '#3b82f6'}
                  stroke="#0f172a"
                  strokeWidth="2"
                  className="cursor-pointer transition-all hover:r-10"
                  onMouseEnter={() => setActiveRegion(region)}
                  onMouseLeave={() => setActiveRegion(null)}
                />
                {/* Pulse animation */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={8}
                  fill="none"
                  stroke={region.conversao > 4 ? '#10b981' : '#3b82f6'}
                  strokeWidth="2"
                  opacity={0.5}
                >
                  <animate
                    attributeName="r"
                    from="8"
                    to="25"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    from="0.5"
                    to="0"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
                {/* Label */}
                <text
                  x={pos.x}
                  y={pos.y - 15}
                  textAnchor="middle"
                  fill="#e2e8f0"
                  fontSize="11"
                  fontWeight="600"
                >
                  {region.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {activeRegion && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute right-4 top-4 rounded-xl border border-slate-600 bg-slate-800 p-4 shadow-xl"
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-semibold text-white">{activeRegion.name}</span>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between gap-6">
                <span className="text-xs text-slate-400">Total revendas</span>
                <span className="text-xs font-bold text-white">{activeRegion.total}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-xs text-slate-400">Vendidas</span>
                <span className="text-xs font-bold text-emerald-400">{activeRegion.vendidas}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-xs text-slate-400">Conversão</span>
                <span className="text-xs font-bold text-blue-400">{activeRegion.conversao}%</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Region cards */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {regions.map((region) => (
          <div
            key={region.id}
            className="rounded-xl bg-slate-700/30 p-3 transition-colors hover:bg-slate-700/50"
          >
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: region.conversao > 4 ? '#10b981' : '#3b82f6' }}
              />
              <span className="text-sm font-medium text-white">{region.name}</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl font-bold text-white">{region.total}</span>
              <span className="text-xs text-slate-400">{region.conversao}% conv.</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
