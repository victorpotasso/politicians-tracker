import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import * as cheerio from 'cheerio';

import { canonicalParty } from '../../src/lib/party';
import type { Dataset, MP, NewsArticle, NewsSource } from '../../src/types/records';
import { fetchText } from '../lib/fetch-cache';
import { clean } from '../lib/normalize';
import type { CollectOptions, Collector, CollectResult } from './types';

interface Feed {
  source: NewsSource;
  url: string;
}

/** Politics RSS feeds, one per source. */
const FEEDS: Feed[] = [
  { source: 'RNZ', url: 'https://www.rnz.co.nz/rss/political.xml' },
  {
    source: 'NZ Herald',
    url: 'https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/nz/politics/?outputType=xml&_website=nzh',
  },
];

/**
 * Surnames of high-profile figures who are commonly referenced by surname alone
 * (party leaders and senior ministers). Surname-only matching is applied only
 * for these, and only when the surname resolves to exactly one MP in the roster
 * (see {@link buildMatcher}). Everyone else is matched on their full name.
 */
const PROMINENT_SURNAMES = [
  'luxon',
  'hipkins',
  'seymour',
  'peters',
  'swarbrick',
  'waititi',
  'willis',
  'stanford',
  'goldsmith',
  'potaka',
  'mcclay',
  'doocey',
  'penk',
  'meager',
  'upston',
  'watts',
  'chhour',
  'simmonds',
  'edmonds',
  'mcanulty',
  'davidson',
  'costello',
  'bishop',
  'mitchell',
  'collins',
  'reti',
];

/** Canonical parties detected directly in article text via distinctive phrasing. */
const PARTY_PATTERNS: Array<[RegExp, string]> = [
  [/\bnational('?s)?\b/, 'National'],
  [/\blabour('?s)?\b/, 'Labour'],
  [/\bgreens?\b|\bgreen party\b/, 'Green'],
  [/\bact party\b|\bact new zealand\b/, 'ACT'],
  [/\bnew zealand first\b|\bnz first\b/, 'New Zealand First'],
  [/\bte pati maori\b|\bmaori party\b/, 'Te Pāti Māori'],
];

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

/** Strip diacritics and lowercase, for accent-insensitive text matching. */
function norm(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse an RFC-822 date (e.g. "Thu, 02 Jul 2026 08:23:38 +1200") to an ISO
 * calendar date, preserving the published day without timezone drift.
 */
function toPublishedDate(pubDate: string | null): string | null {
  if (!pubDate) return null;
  const match = pubDate.match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/);
  if (match) {
    const month = MONTHS[match[2].toLowerCase()];
    if (month) return `${match[3]}-${month}-${match[1].padStart(2, '0')}`;
  }
  const parsed = new Date(pubDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

interface MpMatcher {
  /** Full-name phrases to search for, mapped to their MP id. */
  fullNames: Array<{ re: RegExp; mpId: string }>;
  /** Prominent, roster-unique surnames mapped to their MP id. */
  surnames: Array<{ re: RegExp; mpId: string }>;
}

/** Build the name matcher from the current MP roster. */
function buildMatcher(mps: MP[]): MpMatcher {
  const fullNames = mps
    .map((mp) => ({
      re: new RegExp(`\\b${escapeRegExp(norm(mp.name))}\\b`),
      mpId: mp.mpId,
    }))
    .filter((entry) => entry.re.source.length > 6);

  // Count surname occurrences so surname-only matching stays unambiguous.
  const bySurname = new Map<string, string[]>();
  for (const mp of mps) {
    const tokens = norm(mp.name).split(/\s+/).filter(Boolean);
    const surname = tokens[tokens.length - 1];
    if (!surname) continue;
    const list = bySurname.get(surname) ?? [];
    list.push(mp.mpId);
    bySurname.set(surname, list);
  }

  const surnames = PROMINENT_SURNAMES.flatMap((surname) => {
    const ids = bySurname.get(surname);
    const mpId = ids?.length === 1 ? ids[0] : null;
    if (!mpId) return [];
    return [{ re: new RegExp(`\\b${escapeRegExp(surname)}\\b`), mpId }];
  });

  return { fullNames, surnames };
}

/** Resolve MP mentions and referenced parties for an article. */
function match(
  matcher: MpMatcher,
  mpsById: Map<string, MP>,
  title: string,
  summary: string | null,
): { mentions: string[]; parties: string[] } {
  const text = norm(`${title} ${summary ?? ''}`);
  const mentions = new Set<string>();

  for (const { re, mpId } of matcher.fullNames) if (re.test(text)) mentions.add(mpId);
  for (const { re, mpId } of matcher.surnames) if (re.test(text)) mentions.add(mpId);

  const parties = new Set<string>();
  for (const mpId of mentions) {
    const party = mpsById.get(mpId)?.party;
    if (party) parties.add(canonicalParty(party));
  }
  for (const [re, party] of PARTY_PATTERNS) if (re.test(text)) parties.add(party);

  return {
    mentions: [...mentions].sort(),
    parties: [...parties].sort(),
  };
}

/** Load the collected MP roster (required for cross-referencing). */
async function loadMps(): Promise<MP[]> {
  try {
    const raw = await readFile(join(process.cwd(), 'data', 'mps.json'), 'utf8');
    return (JSON.parse(raw) as Dataset<MP>).records;
  } catch {
    return [];
  }
}

/** Pick the highest-resolution image from a feed item's media:content nodes. */
function pickImage(nodes: Array<{ attribs?: Record<string, string> }>): string | null {
  let best: string | null = null;
  let bestWidth = -1;
  for (const node of nodes) {
    const url = node.attribs?.url;
    if (!url || !/^https?:\/\//.test(url)) continue;
    const width = Number.parseInt(node.attribs?.width ?? '0', 10) || 0;
    if (width >= bestWidth) {
      bestWidth = width;
      best = url;
    }
  }
  return best;
}

async function fetchFeed(
  feed: Feed,
  matcher: MpMatcher,
  mpsById: Map<string, MP>,
  fetchedAt: string,
  force: boolean,
): Promise<NewsArticle[]> {
  const xml = await fetchText(feed.url, { force });
  const $ = cheerio.load(xml, { xml: true });
  const articles: NewsArticle[] = [];

  $('item').each((_i, el) => {
    const item = $(el);
    const title = clean(item.find('title').first().text());
    const url = clean(item.find('link').first().text());
    if (!title || !url) return;

    const guid = clean(item.find('guid').first().text());
    const rawSummary = clean(item.find('description').first().text());
    const summary = rawSummary ? clean(rawSummary.replace(/<[^>]*>/g, ' ')) : null;
    const author = clean(item.find('dc\\:creator, creator').first().text());
    const publishedAt = toPublishedDate(clean(item.find('pubDate').first().text()));
    const imageUrl = pickImage(
      item.find('media\\:content, content').toArray() as Array<{
        attribs?: Record<string, string>;
      }>,
    );
    const { mentions, parties } = match(matcher, mpsById, title, summary);

    const articleId = createHash('sha1')
      .update(`${feed.source}:${guid ?? url}`)
      .digest('hex')
      .slice(0, 16);

    articles.push({
      articleId,
      source: feed.source,
      title,
      url,
      summary,
      author,
      publishedAt,
      imageUrl,
      mentions,
      parties,
      sourceUrl: feed.url,
      fetchedAt,
    });
  });

  return articles;
}

async function run(options: CollectOptions): Promise<CollectResult<NewsArticle>> {
  const fetchedAt = new Date().toISOString();
  const mps = await loadMps();
  if (mps.length === 0) {
    console.warn('  ! No MP roster found — run `data:collect mps` first for name matching.');
  }
  const matcher = buildMatcher(mps);
  const mpsById = new Map(mps.map((mp) => [mp.mpId, mp]));

  const byId = new Map<string, NewsArticle>();
  for (const feed of FEEDS) {
    try {
      const articles = await fetchFeed(feed, matcher, mpsById, fetchedAt, options.force ?? false);
      for (const article of articles) {
        if (!byId.has(article.articleId)) byId.set(article.articleId, article);
      }
    } catch (error) {
      console.warn(`  ! ${feed.source} feed unavailable: ${(error as Error).message}`);
    }
  }

  const records = [...byId.values()].sort((a, b) =>
    (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''),
  );

  return { records, sources: FEEDS.map((f) => f.url) };
}

export const newsCollector: Collector<NewsArticle> = {
  domain: 'news',
  describe: 'Politics news from RNZ & NZ Herald RSS, cross-referenced to MPs',
  run,
};
