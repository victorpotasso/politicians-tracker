import * as cheerio from 'cheerio';

import type { Bill } from '../../src/types/records';
import { BILL_SPONSORS } from '../lib/bill-overrides';
import { fetchText } from '../lib/fetch-cache';
import { clean, slugify, toIsoDate } from '../lib/normalize';
import type { CollectOptions, Collector, CollectResult } from './types';

const DIVISIONS_URL = 'https://voted.nz/divisions';

/**
 * Collect bills and their abstracts from voted.nz, which groups recorded
 * personal votes by bill. Source data is CC-BY 4.0 (Office of the Clerk).
 */
async function run(options: CollectOptions): Promise<CollectResult<Bill>> {
  const html = await fetchText(DIVISIONS_URL, { force: options.force });
  const $ = cheerio.load(html);
  const fetchedAt = new Date().toISOString();
  const records: Bill[] = [];

  $('section#main li')
    .filter((_, li) => $(li).children('h4').length > 0)
    .each((_, li) => {
      const el = $(li);
      const title = clean(el.children('h4').first().text());
      if (!title) return;
      const abstract = clean(el.children('p').first().text());

      // Earliest recorded division date approximates the introduced date.
      const dates = el
        .find('li.division-vote .w3-container > div:first-child')
        .map((_i, d) => toIsoDate($(d).text()))
        .get()
        .filter((d): d is string => Boolean(d))
        .sort();

      const billId = slugify(title);
      const sponsor = BILL_SPONSORS[billId];

      records.push({
        billId,
        title,
        abstract,
        stage: null,
        proponentMpId: sponsor?.proponentMpId ?? null,
        proponentName: sponsor?.proponentName ?? null,
        party: sponsor?.party ?? null,
        introducedDate: dates[0] ?? null,
        documents: [],
        sourceUrl: DIVISIONS_URL,
        fetchedAt,
      });
    });

  return { records, sources: [DIVISIONS_URL] };
}

export const billsCollector: Collector<Bill> = {
  domain: 'bills',
  describe: 'Bills with recorded personal votes (voted.nz, CC-BY 4.0)',
  run,
};
