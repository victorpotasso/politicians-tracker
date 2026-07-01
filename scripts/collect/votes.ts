import * as cheerio from 'cheerio';

import type { Vote } from '../../src/types/records';
import { fetchText } from '../lib/fetch-cache';
import { clean, slugify, toIsoDate } from '../lib/normalize';
import type { CollectOptions, Collector, CollectResult } from './types';

const DIVISIONS_URL = 'https://voted.nz/divisions';

/**
 * Collect division (vote) summaries from voted.nz. Each division is one recorded
 * vote on a bill stage. Individual per-MP breakdowns live on each division page
 * and can be added later via a deep pass. Source data is CC-BY 4.0.
 */
async function run(options: CollectOptions): Promise<CollectResult<Vote>> {
  const html = await fetchText(DIVISIONS_URL, { force: options.force });
  const $ = cheerio.load(html);
  const fetchedAt = new Date().toISOString();
  const records: Vote[] = [];

  $('section#main li')
    .filter((_, li) => $(li).children('h4').length > 0)
    .each((_, li) => {
      const billEl = $(li);
      const billTitle = clean(billEl.children('h4').first().text());
      const billId = billTitle ? slugify(billTitle) : null;

      billEl.find('li.division-vote').each((_i, vote) => {
        const v = $(vote);
        const href = v.find('a').first().attr('href') ?? '';
        const idMatch = href.match(/\/divisions\/([^/]+)\/?$/);
        const voteId = idMatch ? idMatch[1] : null;
        if (!voteId) return;

        const divs = v.find('.w3-container > div');
        const date = toIsoDate($(divs.get(0)).text());
        const issue = clean($(divs.get(1)).text());
        const result = clean(v.find('.passed, .failed, span').last().text());

        // Derive the stage from the "Bill — Stage" issue title where present.
        const stage = issue?.includes('—') ? clean(issue.split('—').pop()) : null;

        records.push({
          voteId,
          billId,
          issue,
          date,
          mpId: null,
          name: null,
          party: null,
          vote: null,
          partyVote: null,
          individualVote: null,
          stage: stage ?? result,
          sourceUrl: `https://voted.nz${href.startsWith('http') ? new URL(href).pathname : href}`,
          fetchedAt,
        });
      });
    });

  return { records, sources: [DIVISIONS_URL] };
}

export const votesCollector: Collector<Vote> = {
  domain: 'votes',
  describe: 'Division vote summaries by bill stage (voted.nz, CC-BY 4.0)',
  run,
};
