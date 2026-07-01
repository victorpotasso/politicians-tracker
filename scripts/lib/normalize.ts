import type { ExpenseCategory, IsoDate, VoteValue, YesNoNull } from '../../src/types/records';

/** Collapse whitespace and trim a string, returning null when empty. */
export function clean(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Build a stable, url-safe identifier from arbitrary text. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const MONTHS: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

/** Normalize a date string to ISO 8601 (`YYYY-MM-DD`), or null when unparseable. */
export function toIsoDate(value: string | null | undefined): IsoDate | null {
  const text = clean(value);
  if (!text) return null;

  // Already ISO.
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // DD/MM/YYYY or DD-MM-YYYY.
  const dmy = text.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }

  // "12 March 2025" / "12 Mar 2025".
  const dMonthY = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (dMonthY) {
    const month = MONTHS[dMonthY[2].slice(0, 3).toLowerCase()];
    if (month) return `${dMonthY[3]}-${month}-${dMonthY[1].padStart(2, '0')}`;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

/** Parse a currency string (e.g. "$1,234.50", "NZ$ 12") to a number in NZD. */
export function toAmount(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = clean(value);
  if (!text) return null;
  const numeric = text.replace(/[^0-9.-]/g, '');
  if (!numeric || numeric === '-' || numeric === '.') return null;
  const amount = Number.parseFloat(numeric);
  return Number.isFinite(amount) ? amount : null;
}

/** Map a free-text category to a canonical expense category. */
export function toExpenseCategory(value: string | null | undefined): ExpenseCategory {
  const text = (clean(value) ?? '').toLowerCase();
  if (/travel|flight|air|taxi|mileage|vehicle|rail|transport/.test(text)) return 'travel';
  if (/accommodat|hotel|lodg|night|stay/.test(text)) return 'accommodation';
  return 'other';
}

/** Map a free-text vote to a canonical vote value. */
export function toVoteValue(value: string | null | undefined): VoteValue | null {
  const text = (clean(value) ?? '').toLowerCase();
  if (!text) return null;
  if (/^(aye|yes|for|in favour|in favor)/.test(text)) return 'aye';
  if (/^(no|nay|against)/.test(text)) return 'nay';
  if (/absent|abstain|did not vote|non-?voting/.test(text)) return 'absent';
  return null;
}

/** Map a free-text yes/no value to canonical `yes` | `no` | `null`. */
export function toYesNo(value: string | null | undefined): YesNoNull {
  const text = (clean(value) ?? '').toLowerCase();
  if (/^(yes|aye|for|in favour|in favor)/.test(text)) return 'yes';
  if (/^(no|nay|against)/.test(text)) return 'no';
  return null;
}

const PARTY_ALIASES: Record<string, string> = {
  national: 'National',
  'national party': 'National',
  labour: 'Labour',
  'labour party': 'Labour',
  green: 'Green',
  greens: 'Green',
  'green party': 'Green',
  act: 'ACT',
  'act party': 'ACT',
  'act new zealand': 'ACT',
  'nz first': 'New Zealand First',
  'new zealand first': 'New Zealand First',
  'te pati maori': 'Te Pāti Māori',
  'te pāti māori': 'Te Pāti Māori',
  'maori party': 'Te Pāti Māori',
  'māori party': 'Te Pāti Māori',
};

/** Normalize a party name to a canonical current name where recognised. */
export function toParty(value: string | null | undefined): string | null {
  const text = clean(value);
  if (!text) return null;
  return PARTY_ALIASES[text.toLowerCase()] ?? text;
}
