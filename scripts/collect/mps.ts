import * as cheerio from 'cheerio';

import type { MP } from '../../src/types/records';
import { fetchText } from '../lib/fetch-cache';
import { clean, toParty } from '../lib/normalize';
import type { CollectOptions, Collector, CollectResult } from './types';

const PEOPLE_URL = 'https://voted.nz/people';

/**
 * Collect the roster of MPs from voted.nz, which republishes Office of the Clerk
 * / Parliamentary Service member data under CC-BY 4.0.
 */
async function run(options: CollectOptions): Promise<CollectResult<MP>> {
  const html = await fetchText(PEOPLE_URL, { force: options.force });
  const $ = cheerio.load(html);
  const fetchedAt = new Date().toISOString();
  const records: MP[] = [];

  $('li.mp-current, li.mp-former').each((_, li) => {
    const el = $(li);
    const anchor = el.find('a[href*="/people/"]').first();
    const href = anchor.attr('href') ?? '';
    const slugMatch = href.match(/\/people\/([^/]+)\/?$/);
    const mpId = slugMatch ? slugMatch[1] : null;

    const name = clean(el.find('.w3-xlarge').first().text());
    if (!mpId || !name) return;

    // Prefer the larger 128px portrait where the source offers a 64px thumbnail.
    const rawSrc = el.find('img').first().attr('src') ?? '';
    let photoUrl: string | null = null;
    if (rawSrc) {
      const abs = rawSrc.startsWith('http') ? rawSrc : `https://voted.nz${rawSrc}`;
      photoUrl = abs.replace('/images/people/64/', '/images/people/128/');
    }

    // The trailing small span holds "<Party>, <Electorate>". An optional leading
    // small span holds an honorific/title (e.g. "Hon", "Rt Hon") when present.
    const smalls = el.find('.w3-small');
    const role = smalls.length > 1 ? clean($(smalls.get(0)).text()) : null;
    const meta = clean($(smalls.get(smalls.length - 1)).text());

    let party: string | null = null;
    let electorate: string | null = null;
    if (meta) {
      const [rawParty, ...rest] = meta.split(',');
      party = toParty(rawParty);
      electorate = clean(rest.join(',')) || null;
    }

    records.push({
      mpId,
      name,
      party,
      electorate,
      role: role && role !== name ? role : null,
      firstElected: null,
      profileUrl: href || null,
      photoUrl,
      sourceUrl: PEOPLE_URL,
      fetchedAt,
    });
  });

  return { records, sources: [PEOPLE_URL] };
}

export const mpsCollector: Collector<MP> = {
  domain: 'mps',
  describe: 'Current and former MPs (voted.nz, CC-BY 4.0)',
  run,
};
