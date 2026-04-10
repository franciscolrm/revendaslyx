'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  Clock,
  FileText,
  ListChecks,
  CheckCircle2,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/badge';

// ── Types ───────────────────────────────────────────────

interface Stage {
  id: string;
  name: string;
  stage_order: number;
  stage_group: string;
  description?: string;
  sla_days?: number;
  requires_documents?: boolean;
  requires_tasks?: boolean;
  checklist?: string[];
  auto_tasks?: { title: string; type: string }[];
}

interface FlowType {
  id: string;
  name: string;
  code: string;
  description?: string;
  total_stages?: number;
  stages?: Stage[];
}

// ── Colors ──────────────────────────────────────────────

const GROUP_STYLES: Record<string, {
  bg: string; fill: string; stroke: string; text: string;
  label: string; dotColor: string;
}> = {
  prospeccao:    { bg: '#f1f5f9', fill: '#f8fafc', stroke: '#94a3b8', text: '#334155', label: 'Prospecção',     dotColor: '#94a3b8' },
  contato:       { bg: '#eff6ff', fill: '#f0f9ff', stroke: '#60a5fa', text: '#1e40af', label: 'Contato',        dotColor: '#3b82f6' },
  cartorio:      { bg: '#faf5ff', fill: '#fdf4ff', stroke: '#c084fc', text: '#6b21a8', label: 'Cartório',       dotColor: '#a855f7' },
  comercial:     { bg: '#fff7ed', fill: '#fffbeb', stroke: '#fb923c', text: '#9a3412', label: 'Comercial',      dotColor: '#f97316' },
  caixa:         { bg: '#fffbeb', fill: '#fefce8', stroke: '#fbbf24', text: '#92400e', label: 'Caixa',          dotColor: '#f59e0b' },
  financiamento: { bg: '#ecfeff', fill: '#f0fdfa', stroke: '#22d3ee', text: '#155e75', label: 'Financiamento',  dotColor: '#06b6d4' },
  transferencia: { bg: '#f0fdfa', fill: '#f0fdf4', stroke: '#2dd4bf', text: '#115e59', label: 'Transferência',  dotColor: '#14b8a6' },
  recebimento:   { bg: '#ecfdf5', fill: '#f0fdf4', stroke: '#34d399', text: '#065f46', label: 'Recebimento',    dotColor: '#10b981' },
  encerramento:  { bg: '#f0fdf4', fill: '#f7fee7', stroke: '#4ade80', text: '#166534', label: 'Encerramento',   dotColor: '#22c55e' },
};

function getGroupStyle(group: string) {
  return GROUP_STYLES[group] ?? GROUP_STYLES.prospeccao;
}

// ── Layout constants ────────────────────────────────────

const NODE_W = 220;
const NODE_H = 72;
const COL_GAP = 80;
const ROW_GAP = 32;
const COLS = 4;
const PAD = 40;

// ── SVG Flow Diagram ────────────────────────────────────

function SvgFlowDiagram({
  stages,
  onSelectStage,
  selectedStageId,
}: {
  stages: Stage[];
  onSelectStage: (s: Stage | null) => void;
  selectedStageId?: string;
}) {
  const sorted = useMemo(() => [...stages].sort((a, b) => a.stage_order - b.stage_order), [stages]);

  // Calculate node positions in a grid layout
  const nodes = useMemo(() => {
    return sorted.map((stage, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      // Alternate row direction for snake layout
      const actualCol = row % 2 === 0 ? col : COLS - 1 - col;
      const x = PAD + actualCol * (NODE_W + COL_GAP);
      const y = PAD + row * (NODE_H + ROW_GAP);
      return { stage, x, y, i };
    });
  }, [sorted]);

  // Calculate edges (Bezier curves between consecutive nodes)
  const edges = useMemo(() => {
    const result: { from: typeof nodes[0]; to: typeof nodes[0]; path: string }[] = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      const from = nodes[i];
      const to = nodes[i + 1];
      const fromCx = from.x + NODE_W / 2;
      const fromCy = from.y + NODE_H;
      const toCx = to.x + NODE_W / 2;
      const toCy = to.y;

      const sameRow = Math.floor(from.i / COLS) === Math.floor(to.i / COLS);

      if (sameRow) {
        // Horizontal connection
        const fromX = from.x < to.x ? from.x + NODE_W : from.x;
        const toX = from.x < to.x ? to.x : to.x + NODE_W;
        const fromY = from.y + NODE_H / 2;
        const toY = to.y + NODE_H / 2;
        const cpOffset = (toX - fromX) * 0.4;
        result.push({
          from, to,
          path: `M ${fromX} ${fromY} C ${fromX + cpOffset} ${fromY}, ${toX - cpOffset} ${toY}, ${toX} ${toY}`,
        });
      } else {
        // Vertical connection (row transition)
        const cpOffset = (toCy - fromCy) * 0.5;
        result.push({
          from, to,
          path: `M ${fromCx} ${fromCy} C ${fromCx} ${fromCy + cpOffset}, ${toCx} ${toCy - cpOffset}, ${toCx} ${toCy}`,
        });
      }
    }
    return result;
  }, [nodes]);

  const totalW = PAD * 2 + COLS * NODE_W + (COLS - 1) * COL_GAP;
  const totalRows = Math.ceil(sorted.length / COLS);
  const totalH = PAD * 2 + totalRows * NODE_H + (totalRows - 1) * ROW_GAP;

  return (
    <div className="overflow-auto rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--muted))]/20">
      <svg
        width={totalW}
        height={totalH}
        viewBox={`0 0 ${totalW} ${totalH}`}
        className="min-w-full"
      >
        {/* Grid dots background */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.5" fill="currentColor" className="text-[rgb(var(--border))]" opacity="0.5" />
          </pattern>
          {/* Arrow marker */}
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
          </marker>
        </defs>
        <rect width={totalW} height={totalH} fill="url(#grid)" />

        {/* Edges */}
        {edges.map((edge, i) => (
          <path
            key={i}
            d={edge.path}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="2"
            strokeDasharray="none"
            markerEnd="url(#arrowhead)"
            className="transition-all duration-300"
          />
        ))}

        {/* Nodes */}
        {nodes.map(({ stage, x, y }) => {
          const style = getGroupStyle(stage.stage_group);
          const isSelected = selectedStageId === stage.id;
          const isFirst = stage.stage_order === 1;
          const isLast = stage.stage_order === sorted.length;

          return (
            <g
              key={stage.id}
              className="cursor-pointer"
              onClick={() => onSelectStage(isSelected ? null : stage)}
            >
              {/* Shadow */}
              <rect
                x={x + 2}
                y={y + 2}
                width={NODE_W}
                height={NODE_H}
                rx="14"
                fill="black"
                opacity="0.04"
              />
              {/* Card background */}
              <rect
                x={x}
                y={y}
                width={NODE_W}
                height={NODE_H}
                rx="14"
                fill={style.fill}
                stroke={isSelected ? '#3b82f6' : style.stroke}
                strokeWidth={isSelected ? 2.5 : 1.5}
                className="transition-all duration-200"
              />
              {/* Left color bar */}
              <rect
                x={x}
                y={y}
                width="5"
                height={NODE_H}
                rx="2"
                fill={style.dotColor}
                clipPath={`inset(0 0 0 0 round 14px 0 0 14px)`}
              />
              <rect x={x} y={y + 1} width="5" height={NODE_H - 2} fill={style.dotColor} rx="0" />
              {/* Step number circle */}
              <circle
                cx={x + 24}
                cy={y + NODE_H / 2}
                r="12"
                fill={isFirst || isLast ? style.dotColor : 'white'}
                stroke={style.dotColor}
                strokeWidth="1.5"
              />
              <text
                x={x + 24}
                y={y + NODE_H / 2 + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isFirst || isLast ? 'white' : style.text}
                fontSize="10"
                fontWeight="700"
                fontFamily="system-ui"
              >
                {stage.stage_order}
              </text>
              {/* Stage name */}
              <text
                x={x + 44}
                y={y + 26}
                fill={style.text}
                fontSize="12"
                fontWeight="600"
                fontFamily="system-ui"
              >
                {stage.name.length > 22 ? stage.name.slice(0, 20) + '...' : stage.name}
              </text>
              {/* Group label */}
              <text
                x={x + 44}
                y={y + 42}
                fill="#94a3b8"
                fontSize="10"
                fontFamily="system-ui"
              >
                {style.label}
              </text>
              {/* Badges row */}
              {stage.sla_days != null && stage.sla_days > 0 && (
                <>
                  <rect x={x + 44} y={y + 50} width="38" height="14" rx="7" fill={style.bg} stroke={style.stroke} strokeWidth="0.5" />
                  <text x={x + 63} y={y + 57} textAnchor="middle" dominantBaseline="central" fill={style.text} fontSize="8" fontFamily="system-ui">
                    {stage.sla_days}d SLA
                  </text>
                </>
              )}
              {stage.requires_documents && (
                <>
                  <rect x={x + (stage.sla_days ? 88 : 44)} y={y + 50} width="30" height="14" rx="7" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="0.5" />
                  <text x={x + (stage.sla_days ? 103 : 59)} y={y + 57} textAnchor="middle" dominantBaseline="central" fill="#2563eb" fontSize="8" fontFamily="system-ui">
                    Docs
                  </text>
                </>
              )}
              {/* Start/End label */}
              {(isFirst || isLast) && (
                <>
                  <rect x={x + NODE_W - 46} y={y + 6} width={40} height="16" rx="8" fill={isFirst ? '#22c55e' : '#ef4444'} />
                  <text x={x + NODE_W - 26} y={y + 14} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="8" fontWeight="600" fontFamily="system-ui">
                    {isFirst ? 'Início' : 'Fim'}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Stage Detail Panel ──────────────────────────────────

function StageDetailPanel({ stage, onClose }: { stage: Stage; onClose: () => void }) {
  const style = getGroupStyle(stage.stage_group);

  return (
    <div className="w-80 shrink-0 border-l border-[rgb(var(--border))] bg-[rgb(var(--card))] overflow-y-auto">
      <div className="border-b border-[rgb(var(--border))] px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ backgroundColor: style.dotColor }}>
              {stage.stage_order}
            </div>
            <h3 className="text-[13px] font-semibold text-[rgb(var(--foreground))]">{stage.name}</h3>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))]">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        {/* Group */}
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">Grupo</p>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: style.dotColor }} />
            <span className="text-[13px] font-medium text-[rgb(var(--foreground))]">{style.label}</span>
          </div>
        </div>

        {stage.description && (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">Descrição</p>
            <p className="mt-1 text-[12px] text-[rgb(var(--foreground))]">{stage.description}</p>
          </div>
        )}

        {/* SLA */}
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">SLA</p>
          <div className="mt-1 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[rgb(var(--muted-foreground))]" />
            <span className="text-[13px] font-medium text-[rgb(var(--foreground))]">
              {stage.sla_days ? `${stage.sla_days} dias` : 'Sem prazo definido'}
            </span>
          </div>
        </div>

        {/* Requirements */}
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">Requisitos</p>
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2">
              {stage.requires_documents ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-[rgb(var(--border))]" />
              )}
              <span className="text-[12px] text-[rgb(var(--foreground))]">Requer documentos</span>
            </div>
            <div className="flex items-center gap-2">
              {stage.requires_tasks ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-[rgb(var(--border))]" />
              )}
              <span className="text-[12px] text-[rgb(var(--foreground))]">Requer tarefas</span>
            </div>
          </div>
        </div>

        {/* Checklist */}
        {stage.checklist && stage.checklist.length > 0 && (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">Checklist</p>
            <div className="mt-2 space-y-1.5">
              {stage.checklist.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <ListChecks className="mt-0.5 h-3 w-3 shrink-0 text-primary-500" />
                  <span className="text-[12px] text-[rgb(var(--foreground))]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Auto tasks */}
        {stage.auto_tasks && stage.auto_tasks.length > 0 && (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">Tarefas automáticas</p>
            <div className="mt-2 space-y-1.5">
              {stage.auto_tasks.map((task, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Zap className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                  <span className="text-[12px] text-[rgb(var(--foreground))]">{task.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Flow Diagram Drawer ────────────────────────────

export function FlowDiagramDrawer({
  flow,
  onClose,
}: {
  flow: FlowType;
  onClose: () => void;
}) {
  const stages = useMemo(
    () => (flow.stages ?? []).sort((a, b) => a.stage_order - b.stage_order),
    [flow.stages],
  );
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const groups = [...new Set(stages.map((s) => s.stage_group))];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative ml-auto flex h-full w-full max-w-[calc(100vw-260px)] flex-col bg-[rgb(var(--background))] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgb(var(--border))] bg-[rgb(var(--card))] px-6 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-[rgb(var(--foreground))]">{flow.name}</h2>
            <div className="mt-1 flex items-center gap-3">
              <span className="text-[12px] text-[rgb(var(--muted-foreground))]">{stages.length} etapas</span>
              <div className="flex items-center gap-1">
                {groups.map((g) => (
                  <div key={g} className="h-2 w-2 rounded-full" style={{ backgroundColor: getGroupStyle(g).dotColor }} title={getGroupStyle(g).label} />
                ))}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Diagram area */}
          <div className="flex-1 overflow-auto p-4">
            <SvgFlowDiagram
              stages={stages}
              onSelectStage={setSelectedStage}
              selectedStageId={selectedStage?.id}
            />
          </div>

          {/* Detail panel */}
          {selectedStage && (
            <StageDetailPanel stage={selectedStage} onClose={() => setSelectedStage(null)} />
          )}
        </div>
      </div>
    </div>
  );
}
