/**
 * Government "mandates" and spending metrics for the Crown-spending module.
 *
 * This is a plain module (not `server-only`) so the interactive client explorer
 * can classify and filter fiscal years without a network round-trip.
 *
 * Mandate attribution: a fiscal year is credited to the government in office at
 * the *start* of that fiscal year (1 July, or 1 April pre-1990). Because New
 * Zealand general elections are held late in the calendar year (Sept–Nov), the
 * winner of the election in year `E` governs the fiscal years `E+1` onward until
 * the next election. Consecutive terms led by the same governing bloc are merged
 * into a single continuous mandate for cleaner filtering.
 */

import type { SpendingYear } from '@/types/records';

export interface Mandate {
  /** URL/DOM-safe identifier. */
  id: string;
  /** Prime Minister(s) who led the government over the mandate. */
  pm: string;
  /** Governing (PM's) party — drives the accent colour. */
  party: string;
  /** General election that produced the mandate. */
  election: number;
  /** First fiscal year (inclusive) governed under the mandate. */
  fromYear: number;
  /** Last fiscal year (inclusive) governed under the mandate. */
  toYear: number;
  /** Short description of the government arrangement. */
  note: string;
}

/**
 * Continuous governments across the Fiscal Time Series window (1972–2026),
 * ordered oldest-first. Spans are by fiscal year end.
 */
export const MANDATES: Mandate[] = [
  {
    id: 'holyoake-marshall',
    pm: 'Holyoake / Marshall',
    party: 'National',
    election: 1969,
    fromYear: 1970,
    toYear: 1972,
    note: 'National government led by Keith Holyoake, then Jack Marshall.',
  },
  {
    id: 'kirk-rowling',
    pm: 'Kirk / Rowling',
    party: 'Labour',
    election: 1972,
    fromYear: 1973,
    toYear: 1975,
    note: 'Third Labour Government under Norman Kirk, then Bill Rowling.',
  },
  {
    id: 'muldoon',
    pm: 'Robert Muldoon',
    party: 'National',
    election: 1975,
    fromYear: 1976,
    toYear: 1984,
    note: 'Third National Government led by Robert Muldoon.',
  },
  {
    id: 'lange-palmer-moore',
    pm: 'Lange / Palmer / Moore',
    party: 'Labour',
    election: 1984,
    fromYear: 1985,
    toYear: 1990,
    note: 'Fourth Labour Government and the "Rogernomics" reforms.',
  },
  {
    id: 'bolger-national',
    pm: 'Jim Bolger',
    party: 'National',
    election: 1990,
    fromYear: 1991,
    toYear: 1996,
    note: 'Fourth National Government led by Jim Bolger (pre-MMP terms).',
  },
  {
    id: 'bolger-shipley',
    pm: 'Bolger / Shipley',
    party: 'National',
    election: 1996,
    fromYear: 1997,
    toYear: 1999,
    note: 'National–NZ First coalition, the first government under MMP.',
  },
  {
    id: 'clark',
    pm: 'Helen Clark',
    party: 'Labour',
    election: 1999,
    fromYear: 2000,
    toYear: 2008,
    note: 'Fifth Labour Government led by Helen Clark (three terms).',
  },
  {
    id: 'key-english',
    pm: 'Key / English',
    party: 'National',
    election: 2008,
    fromYear: 2009,
    toYear: 2017,
    note: 'Fifth National Government led by John Key, then Bill English.',
  },
  {
    id: 'ardern-hipkins',
    pm: 'Ardern / Hipkins',
    party: 'Labour',
    election: 2017,
    fromYear: 2018,
    toYear: 2023,
    note: 'Sixth Labour Government led by Jacinda Ardern, then Chris Hipkins.',
  },
  {
    id: 'luxon',
    pm: 'Christopher Luxon',
    party: 'National',
    election: 2023,
    fromYear: 2024,
    toYear: 2026,
    note: 'National–ACT–NZ First coalition led by Christopher Luxon.',
  },
];

/** The mandate governing a given fiscal year, or null when out of range. */
export function mandateForYear(year: number): Mandate | null {
  return MANDATES.find((m) => year >= m.fromYear && year <= m.toYear) ?? null;
}

/** The mandates that overlap a fiscal-year range, oldest-first. */
export function mandatesInRange(fromYear: number, toYear: number): Mandate[] {
  return MANDATES.filter((m) => m.toYear >= fromYear && m.fromYear <= toYear);
}

/** Selectable spending metrics. */
export type SpendingMetric = 'core' | 'total' | 'net' | 'pctGdp';

export interface MetricMeta {
  id: SpendingMetric;
  label: string;
  short: string;
  /** Whether the metric is a percentage rather than NZD millions. */
  percent: boolean;
  description: string;
}

export const SPENDING_METRICS: MetricMeta[] = [
  {
    id: 'core',
    label: 'Core Crown expenses',
    short: 'Core Crown',
    percent: false,
    description: 'Headline government spending (falls back to cash-era net spend before 1994).',
  },
  {
    id: 'total',
    label: 'Total Crown expenses',
    short: 'Total Crown',
    percent: false,
    description: 'Includes Crown entities and state-owned enterprises.',
  },
  {
    id: 'net',
    label: 'Financial net expenditure',
    short: 'Net spend',
    percent: false,
    description: 'The cash-basis net spending measure reported since 1972.',
  },
  {
    id: 'pctGdp',
    label: 'Core Crown as % of GDP',
    short: '% of GDP',
    percent: true,
    description: 'Core Crown expenses measured against nominal GDP.',
  },
];

/** The headline spend for a year: Core Crown, falling back to cash-era net spend. */
export function headlineSpend(year: SpendingYear): number | null {
  return year.coreCrownExpenses ?? year.financialNetExpenditure;
}

/** Core-Crown expenses as a percentage of nominal GDP, or null when unavailable. */
export function spendPctGdp(year: SpendingYear): number | null {
  const spend = headlineSpend(year);
  if (spend === null || !year.nominalGdp) return null;
  return (spend / year.nominalGdp) * 100;
}

/** Resolve a metric's value for a fiscal year (NZD millions, or a percentage). */
export function metricValue(year: SpendingYear, metric: SpendingMetric): number | null {
  switch (metric) {
    case 'core':
      return headlineSpend(year);
    case 'total':
      return year.totalCrownExpenses ?? headlineSpend(year);
    case 'net':
      return year.financialNetExpenditure ?? year.coreCrownExpenses;
    case 'pctGdp':
      return spendPctGdp(year);
    default:
      return null;
  }
}
