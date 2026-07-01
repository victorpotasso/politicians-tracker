import * as cheerio from 'cheerio';

import type { Poll, PollResult } from '../../src/types/records';
import { fetchJson } from '../lib/fetch-cache';
import { clean, slugify, toIsoDate } from '../lib/normalize';
import type { CollectOptions, Collector, CollectResult } from './types';

/**
 * Election cycles to collect, newest first. Each Wikipedia page's first table
 * spans the polls taken between the previous election and its own, so together
 * they give contiguous coverage. Newest-first ordering means a poll is
 * attributed to the earliest (upcoming) campaign it was measuring.
 */
const ELECTIONS = ['2026', '2023', '2020', '2017', '2014', '2011', '2008'];

function pageTitle(election: string): string {
  return `Opinion_polling_for_the_${election}_New_Zealand_general_election`;
}

function pageUrl(election: string): string {
  return `https://en.wikipedia.org/wiki/${pageTitle(election)}`;
}

function apiUrl(election: string): string {
  return (
    `https://en.wikipedia.org/w/api.php?action=parse&page=${pageTitle(election)}` +
    '&prop=text&format=json&formatversion=2'
  );
}

/**
 * Map published column labels — abbreviations or full names, across cycles — to
 * canonical party names. Keys are normalized (uppercase, diacritics and
 * punctuation stripped) via {@link normKey}.
 */
const CODE_TO_PARTY: Record<string, string> = {
  NAT: 'National',
  NATIONAL: 'National',
  LAB: 'Labour',
  LABOUR: 'Labour',
  GRN: 'Green',
  GREEN: 'Green',
  ACT: 'ACT',
  NZF: 'New Zealand First',
  NZFIRST: 'New Zealand First',
  NEWZEALANDFIRST: 'New Zealand First',
  TPM: 'Te Pāti Māori',
  MRI: 'Te Pāti Māori',
  MAORI: 'Te Pāti Māori',
  MAORIPARTY: 'Te Pāti Māori',
  TEPATIMAORI: 'Te Pāti Māori',
  TOP: 'The Opportunities Party',
  UNF: 'United Future',
  UNITEDFUTURE: 'United Future',
  CON: 'Conservative',
  CONSERVATIVE: 'Conservative',
  NCP: 'New Conservative',
  NEWCONSERVATIVE: 'New Conservative',
  MNA: 'Mana Party',
  MANA: 'Mana Party',
  PROG: 'Progressive',
  PROGRESSIVE: 'Progressive',
  ANZ: 'Advance NZ',
  ADVANCENZ: 'Advance NZ',
  INTERNET: 'Internet Party',
  INTERNETMANA: 'Internet Mana',
};

interface WikiParseResponse {
  parse?: { text: string };
}

/** Strip footnote markers like `[a]`/`[12]` and collapse whitespace. */
function stripRefs(text: string): string {
  return (clean(text) ?? '').replace(/\[[^\]]*\]/g, '').trim();
}

/** Clean a pollster cell: drop trailing "Archived … Wayback Machine" citations. */
function cleanPollster(text: string): string {
  return stripRefs(text)
    .replace(/\s*Archived\b.*$/i, '')
    .replace(/\s*\(page does not exist\)/i, '')
    .trim();
}

/** Normalize a header label for lookups: uppercase, strip diacritics/punctuation. */
function normKey(text: string): string {
  return stripRefs(text)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '');
}

/** Parse a percentage cell; treats dashes, blanks and "N/A" as "not reported". */
function toPercent(text: string): number | null {
  const cleaned = stripRefs(text);
  if (!cleaned || /^[–—-]$/.test(cleaned) || /^n\/?a$/i.test(cleaned)) return null;
  const value = Number.parseFloat(cleaned.replace(/[^0-9.]/g, ''));
  return Number.isFinite(value) ? value : null;
}

/** Parse a sample-size cell like `1,001` into a number. */
function toSample(text: string): number | null {
  const cleaned = stripRefs(text);
  if (/^n\/?a$/i.test(cleaned)) return null;
  const digits = cleaned.replace(/[^0-9]/g, '');
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) ? value : null;
}

interface DateRange {
  start: string | null;
  end: string | null;
}

/**
 * Parse a fieldwork date range such as `13–17 Jun 2026`, `25 May – 21 Jun 2026`
 * or `28 Dec 2025 – 3 Jan 2026`. The end token always carries month and year;
 * a short start token inherits whichever of those it omits.
 */
function parseDateRange(text: string): DateRange {
  const cleaned = stripRefs(text).replace(/[–—]/g, '-');
  const [left, right] = cleaned.includes('-')
    ? cleaned.split('-').map((s) => s.trim())
    : [cleaned, cleaned];

  const endMatch = right.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!endMatch) return { start: null, end: null };
  const [, endDay, endMonth, endYear] = endMatch;
  const end = toIsoDate(`${endDay} ${endMonth} ${endYear}`);

  const startMatch = left.match(/(\d{1,2})(?:\s+([A-Za-z]+))?(?:\s+(\d{4}))?/);
  if (!startMatch) return { start: end, end };
  const [, startDay, startMonth, startYear] = startMatch;
  const start = toIsoDate(`${startDay} ${startMonth ?? endMonth} ${startYear ?? endYear}`);

  return { start, end };
}

/** Build a column index from a table's raw header labels (order varies by year). */
function indexColumns(labels: string[]) {
  const keys = labels.map(normKey);
  const columns = {
    date: keys.findIndex((k) => k.includes('DATE')),
    pollster: keys.findIndex((k) => k.includes('POLL')),
    sample: keys.findIndex((k) => k.includes('SAMPLE')),
    parties: [] as { index: number; code: string; party: string }[],
    lead: keys.indexOf('LEAD'),
  };

  keys.forEach((key, index) => {
    const party = CODE_TO_PARTY[key];
    if (party) columns.parties.push({ index, code: labels[index] || key, party });
  });

  return columns;
}

/** Parse a single election page's poll tables into Poll records. */
function parsePage(html: string, election: string, fetchedAt: string, seen: Set<string>): Poll[] {
  const $ = cheerio.load(html);
  const records: Poll[] = [];

  // Pages may split polls into several per-year tables; non-poll tables
  // (preferred PM, country direction, seat projections) lack party columns and
  // are skipped by the column guard below.
  for (const tableEl of $('table.wikitable').toArray()) {
    const rows = $(tableEl).find('tr').toArray();
    if (rows.length === 0) continue;

    const headerLabels = $(rows[0])
      .find('th,td')
      .map((_, c) => stripRefs($(c).text()))
      .get();
    const columns = indexColumns(headerLabels);
    if (columns.date < 0 || columns.pollster < 0 || columns.parties.length === 0) continue;

    for (const row of rows.slice(1)) {
      const cells = $(row).find('td,th').toArray();
      // Full-width annotation rows (event notes) collapse to a single cell.
      if (cells.length <= columns.parties.length) continue;

      const cellText = (index: number): string =>
        index >= 0 && index < cells.length ? $(cells[index]).text() : '';

      const pollster = cleanPollster(cellText(columns.pollster));
      const { start, end } = parseDateRange(cellText(columns.date));
      if (!pollster || !end) continue;
      // Skip the general-election result rows embedded in the tables.
      if (/election result/i.test(pollster)) continue;

      const results: PollResult[] = columns.parties
        .map(({ index, code, party }) => ({
          party,
          code,
          percentage: toPercent(cellText(index)),
        }))
        .filter((r) => r.percentage !== null);
      if (results.length < 2) continue;

      const dedupeKey = `${pollster}|${start ?? ''}|${end}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      records.push({
        pollId: slugify(`${pollster}-${end}`),
        pollster,
        startDate: start,
        endDate: end,
        sampleSize: toSample(cellText(columns.sample)),
        election,
        results,
        lead: toPercent(cellText(columns.lead)),
        sourceUrl: pageUrl(election),
        fetchedAt,
      });
    }
  }

  return records;
}

/**
 * Collect published party-vote opinion polls across recent general-election
 * cycles from Wikipedia's poll-aggregation pages (the same upstream used by the
 * `nzelect` package and Andrew Chen's polls archive). Data is CC BY-SA 4.0.
 */
async function run(options: CollectOptions): Promise<CollectResult<Poll>> {
  const fetchedAt = new Date().toISOString();
  const records: Poll[] = [];
  const sources: string[] = [];
  const seen = new Set<string>();
  const pollIds = new Map<string, number>();
  let failed = 0;

  for (const election of ELECTIONS) {
    let response: WikiParseResponse;
    try {
      response = await fetchJson<WikiParseResponse>(apiUrl(election), { force: options.force });
    } catch {
      failed += 1;
      continue;
    }
    const html = response.parse?.text;
    if (!html) {
      failed += 1;
      continue;
    }

    const pagePolls = parsePage(html, election, fetchedAt, seen);
    // Ensure globally-unique poll ids (same pollster+date across cycles is rare).
    for (const poll of pagePolls) {
      const collisions = pollIds.get(poll.pollId) ?? 0;
      pollIds.set(poll.pollId, collisions + 1);
      if (collisions > 0) poll.pollId = `${poll.pollId}-${collisions + 1}`;
    }

    if (pagePolls.length > 0) {
      records.push(...pagePolls);
      sources.push(pageUrl(election));
    }
  }

  if (records.length === 0) {
    throw new Error('No polls parsed from any election page.');
  }
  if (failed > 0) console.warn(`  ~ ${failed} election page(s) could not be fetched or parsed.`);

  return { records, sources };
}

export const pollsCollector: Collector<Poll> = {
  domain: 'polls',
  describe: `Party-vote opinion polls across ${ELECTIONS.length} election cycles (Wikipedia, CC BY-SA 4.0)`,
  run,
};
