/**
 * Central text matching utilities for the import system.
 * Replaces hardcoded name comparisons with normalized, flexible matching.
 *
 * Design principles:
 * - Normalize before compare (accents, case, spaces)
 * - Try exact match first, then aliases, then similarity
 * - Never silently discard data — fallback and log
 * - Deterministic and auditable (no ML, no randomness)
 */

// ── Normalization ──

/** Remove accents, lowercase, collapse spaces, trim */
export function normalizeText(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accent marks
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Title Case with accent-safe cleanup */
export function normalizeGroupName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\-áéíóúãõâêôàçüÁÉÍÓÚÃÕÂÊÔÀÇÜ]/gi, '')
    .trim()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// ── Column Finding ──

/**
 * Find a column index in headers array using normalized comparison.
 * Tries each alias in order. Returns -1 if not found.
 *
 * Matching strategy:
 * 1. Exact normalized match
 * 2. Normalized includes (header contains alias)
 */
export function findColumn(headers: string[], ...aliases: string[]): number {
  const normalized = headers.map(normalizeText);

  for (const alias of aliases) {
    const needle = normalizeText(alias);
    if (!needle) continue;

    // 1. Exact match
    const exact = normalized.indexOf(needle);
    if (exact >= 0) return exact;

    // 2. Includes match (header contains alias OR alias contains header)
    const includes = normalized.findIndex(
      (h) => h.length > 0 && (h.includes(needle) || needle.includes(h)),
    );
    if (includes >= 0) return includes;
  }

  return -1;
}

/**
 * Get a cell value from a row using flexible column matching.
 * Equivalent to the old `get(row, 'Name1') || get(row, 'Name2')` pattern
 * but with normalization built in.
 */
export function getCell(row: any[], headers: string[], ...aliases: string[]): any {
  for (const alias of aliases) {
    const idx = findColumn(headers, alias);
    if (idx >= 0 && row[idx] !== undefined && row[idx] !== null && row[idx] !== '') {
      return row[idx];
    }
  }
  return null;
}

// ── Text Similarity ──

/**
 * Dice coefficient between two strings (after normalization).
 * Returns 0.0 (no match) to 1.0 (identical).
 * Fast, deterministic, no external dependencies.
 */
export function textSimilarity(a: string, b: string): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (na === nb) return 1.0;
  if (na.length < 2 || nb.length < 2) return 0.0;

  const bigrams = (s: string): Set<string> => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.substring(i, i + 2));
    return set;
  };

  const aBigrams = bigrams(na);
  const bBigrams = bigrams(nb);
  let intersection = 0;
  for (const bg of aBigrams) {
    if (bBigrams.has(bg)) intersection++;
  }

  return (2 * intersection) / (aBigrams.size + bBigrams.size);
}

/**
 * Find the best match for a needle in a list of candidates.
 * Returns { match, score, index } or null if below threshold.
 */
export function findBestMatch(
  needle: string,
  candidates: string[],
  threshold = 0.6,
): { match: string; score: number; index: number } | null {
  let best: { match: string; score: number; index: number } | null = null;

  for (let i = 0; i < candidates.length; i++) {
    const score = textSimilarity(needle, candidates[i]);
    if (score >= threshold && (!best || score > best.score)) {
      best = { match: candidates[i], score, index: i };
    }
  }

  return best;
}

// ── Date Extraction ──

/**
 * Extract group name and date from a header like:
 * - "Jersey 08-04"
 * - "Reno  07/04 (Terça-feira)"
 * - "26/03 (Quinta-feira)"
 * - "Jersey City Fase I 08-04"
 *
 * Returns { group, date } or null if no date pattern found.
 * Date is returned as "YYYY-MM-DD" using the current year.
 */
export function extractDateFromHeader(
  header: string,
  fallbackGroup?: string,
): { group: string; date: string; raw: string } | null {
  const trimmed = (header || '').trim();
  if (!trimmed || trimmed.length < 4) return null;

  // Match: optional group text + DD-MM or DD/MM + optional (weekday text)
  const match = trimmed.match(/^(.*?)\s*(\d{2})[\/\-](\d{2})(?:\s*\(.*\))?$/);
  if (!match) return null;

  const groupRaw = match[1].trim();
  const day = match[2];
  const month = match[3];
  const year = new Date().getFullYear();
  const date = `${year}-${month}-${day}`;

  const group = groupRaw || fallbackGroup || 'Desconhecido';

  return { group: normalizeGroupName(group), date, raw: trimmed };
}

// ── Stage Group Mapping ──

/** Normalized status-to-stage mapping. All keys are already normalized (no accents, lowercase). */
const STAGE_MAP: Array<{ keywords: string[]; group: string }> = [
  { keywords: ['angariacao', 'angariação'], group: 'captacao' },
  { keywords: ['vendida'], group: 'venda_concluida' },
  { keywords: ['liberada pra venda', 'liberada para venda'], group: 'comercial' },
  { keywords: ['em contato'], group: 'contato' },
  { keywords: ['renegociacao', 'renegociação'], group: 'renegociacao' },
  { keywords: ['agendada cartorio', 'agendada - cartorio', 'em agendamento'], group: 'cartorio' },
  { keywords: ['enviado a agencia', 'enviado agencia', 'agendado - caixa', 'agendado caixa'], group: 'financiamento' },
  { keywords: ['aguardando retorno'], group: 'aguardando' },
  { keywords: ['sem retorno', 'sem retorno/contato', 'sem retorno comercial'], group: 'sem_retorno' },
  { keywords: ['sem interesse', 'sem condicoes'], group: 'encerrado' },
  { keywords: ['numero invalido'], group: 'problema' },
  { keywords: ['juridico'], group: 'cartorio' },
  { keywords: ['adimplente'], group: 'adimplente' },
];

/**
 * Map a raw status name to a stage group.
 * Uses normalized text comparison — accent-safe, case-insensitive.
 */
export function mapStatusToStageGroup(rawStatus: string): string {
  const normalized = normalizeText(rawStatus);
  if (!normalized) return 'outros';

  for (const entry of STAGE_MAP) {
    for (const kw of entry.keywords) {
      if (normalized.includes(normalizeText(kw))) return entry.group;
    }
  }

  return 'outros';
}
