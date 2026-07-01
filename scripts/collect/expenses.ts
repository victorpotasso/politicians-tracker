import * as cheerio from 'cheerio';

import type { Expense } from '../../src/types/records';
import { fetchText } from '../lib/fetch-cache';
import { clean, toAmount, toExpenseCategory, toIsoDate } from '../lib/normalize';
import type { CollectOptions, Collector, CollectResult } from './types';

const EXPENSES_URL = 'https://www.parliament.nz/en/mps-and-electorates/mps-expenses/';

/**
 * Best-effort collector for quarterly MP expenses published on parliament.nz.
 * The site is behind a bot challenge, so this collector parses any expense
 * tables it can reach and degrades to an empty dataset (with a warning) when the
 * source is unavailable, rather than failing the whole run.
 */
async function run(options: CollectOptions): Promise<CollectResult<Expense>> {
  const fetchedAt = new Date().toISOString();
  const records: Expense[] = [];

  let html: string;
  try {
    html = await fetchText(EXPENSES_URL, { force: options.force });
  } catch (error) {
    console.warn(`  ! MP expenses source unavailable: ${(error as Error).message}`);
    return { records, sources: [EXPENSES_URL] };
  }

  const $ = cheerio.load(html);
  $('table').each((_, table) => {
    const headers = $(table)
      .find('th')
      .map((_i, th) => clean($(th).text())?.toLowerCase() ?? '')
      .get();
    const nameIdx = headers.findIndex((h) => h.includes('member') || h.includes('name'));
    const amountIdx = headers.findIndex((h) => h.includes('total') || h.includes('amount'));
    if (amountIdx < 0) return;

    $(table)
      .find('tbody tr')
      .each((_i, tr) => {
        const cells = $(tr)
          .find('td')
          .map((_j, td) => clean($(td).text()))
          .get();
        const amount = toAmount(cells[amountIdx]);
        if (amount == null) return;
        const description = nameIdx >= 0 ? cells[nameIdx] : cells[0];
        records.push({
          mpId: null,
          ministerName: null,
          period: toIsoDate(fetchedAt)?.slice(0, 7) ?? '',
          category: toExpenseCategory(description),
          amount,
          description,
          sourceUrl: EXPENSES_URL,
          fetchedAt,
        });
      });
  });

  if (records.length === 0) {
    console.warn('  ! No MP expense tables parsed (source may require a browser).');
  }
  return { records, sources: [EXPENSES_URL] };
}

export const expensesCollector: Collector<Expense> = {
  domain: 'expenses',
  describe: 'Quarterly MP expenses (parliament.nz, best-effort)',
  run,
};
