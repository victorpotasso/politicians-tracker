import * as cheerio from 'cheerio';

import type { MP, Vote } from '../../src/types/records';
import { fetchText } from '../lib/fetch-cache';
import { readDataset } from '../lib/io';
import { clean, slugify, toIsoDate, toVoteValue } from '../lib/normalize';
import type { CollectOptions, Collector, CollectResult } from './types';

/**
 * Collect per-MP votes by parsing each MP's voted.nz person page ("How X
 * voted"). Every recorded division becomes a Vote row with the MP's individual
 * position, linked to its bill. Source data is CC-BY 4.0 (Office of the Clerk).
 */
async function run(options: CollectOptions): Promise<CollectResult<Vote>> {
  const fetchedAt = new Date().toISOString();
  const records: Vote[] = [];

  const mps = await readDataset<MP>('mps');
  if (mps.records.length === 0) {
    console.warn('  ! No MPs found. Run `pnpm data:collect mps` first.');
    return { records, sources: [] };
  }

  const sources = ['https://voted.nz/people'];
  let failed = 0;

  for (const mp of mps.records) {
    const url = mp.profileUrl ?? `https://voted.nz/people/${mp.mpId}/`;
    let html: string;
    try {
      html = await fetchText(url, { force: options.force });
    } catch {
      failed += 1;
      continue;
    }

    const $ = cheerio.load(html);
    $('.w3-container h3')
      .filter((_, h) => /how .* voted/i.test($(h).text()))
      .nextAll('ul')
      .first()
      .children('li')
      .each((_, li) => {
        const group = $(li);
        const billTitle = clean(group.find('h4 b').first().text());
        const billId = billTitle ? slugify(billTitle) : null;

        group.find('li.division-vote').each((_i, vote) => {
          const v = $(vote);
          const href = v.find('a').first().attr('href') ?? '';
          const voteId = href.match(/\/divisions\/([^/]+)\/?$/)?.[1] ?? null;
          if (!voteId) return;

          const divs = v.find('.w3-container > div');
          const date = toIsoDate($(divs.get(0)).text());
          const issue = clean($(divs.get(1)).text());

          const forAgainst = v.find('span.for, span.against').first();
          const value = forAgainst.length
            ? forAgainst.hasClass('for')
              ? 'aye'
              : 'nay'
            : toVoteValue(v.text());
          const stage = issue?.includes('—') ? clean(issue.split('—').pop()) : null;

          records.push({
            voteId,
            billId,
            issue,
            date,
            mpId: mp.mpId,
            name: mp.name,
            party: mp.party,
            vote: value,
            partyVote: null,
            individualVote: value === 'aye' ? 'yes' : value === 'nay' ? 'no' : null,
            stage,
            sourceUrl: url,
            fetchedAt,
          });
        });
      });
  }

  if (failed > 0) console.warn(`  ~ ${failed} person pages could not be fetched.`);
  return { records, sources };
}

export const votesCollector: Collector<Vote> = {
  domain: 'votes',
  describe: 'Per-MP votes from person pages (voted.nz, CC-BY 4.0)',
  run,
};
