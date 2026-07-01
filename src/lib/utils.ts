import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const NZD = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  maximumFractionDigits: 0,
});

/** Format a number as whole New Zealand dollars, e.g. `$12,345`. */
export function formatNZD(amount: number): string {
  return NZD.format(amount);
}

/** Compact currency for tight spaces, e.g. `$1.2M`, `$34k`. */
export function formatNZDCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `$${Math.round(amount / 1_000)}k`;
  return `$${Math.round(amount)}`;
}

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Parse a `YYYY-MM-DD` string without timezone drift. */
function parseIsoDate(iso: string): { year: number; month: number; day: number } | null {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/**
 * Format an ISO date as `21 Jun 2026`. Deterministic (no `Intl`/locale), so it
 * renders identically on the server and client and avoids hydration mismatches.
 */
export function formatDayMonthYear(iso: string | null): string {
  if (!iso) return '—';
  const d = parseIsoDate(iso);
  return d ? `${d.day} ${MONTHS_SHORT[d.month - 1]} ${d.year}` : iso;
}

/** Format an ISO date as a compact `Jun '26` axis label. Deterministic. */
export function formatMonthYearShort(iso: string): string {
  const d = parseIsoDate(iso);
  return d ? `${MONTHS_SHORT[d.month - 1]} '${String(d.year).slice(2)}` : iso;
}

/** Parse a `YYYY-QN` expense period. Returns null when not quarter-formatted. */
function parseQuarter(period: string): { year: number; quarter: number } | null {
  const match = period.match(/^(\d{4})-Q([1-4])$/);
  if (!match) return null;
  return { year: Number(match[1]), quarter: Number(match[2]) };
}

/** Format an expense period as a compact `Q4 '25` axis label. Deterministic. */
export function formatQuarterShort(period: string): string {
  const q = parseQuarter(period);
  return q ? `Q${q.quarter} '${String(q.year).slice(2)}` : period;
}

/** Format an expense period as a readable `Oct–Dec 2025` range. Deterministic. */
export function formatQuarterLong(period: string): string {
  const q = parseQuarter(period);
  if (!q) return period;
  const startMonth = (q.quarter - 1) * 3;
  return `${MONTHS_SHORT[startMonth]}–${MONTHS_SHORT[startMonth + 2]} ${q.year}`;
}

/** Format an expense period as `Q4 2025`. Deterministic. */
export function formatQuarterFull(period: string): string {
  const q = parseQuarter(period);
  return q ? `Q${q.quarter} ${q.year}` : period;
}

/**
 * Format a coverage range from period strings, e.g. `Q1 2024 – Q4 2025`. Expects the
 * caller to pass the first and last periods (chronologically). Deterministic.
 */
export function formatPeriodRange(first: string | null, last: string | null): string {
  if (!first || !last) return '—';
  const from = formatQuarterFull(first);
  const to = formatQuarterFull(last);
  return from === to ? from : `${from} – ${to}`;
}

/** Group an integer with comma thousands separators without locale dependence. */
export function groupThousands(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
