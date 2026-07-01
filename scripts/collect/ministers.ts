import * as cheerio from 'cheerio';

import type { Expense } from '../../src/types/records';
import { fetchText } from '../lib/fetch-cache';
import { clean, toAmount, toExpenseCategory } from '../lib/normalize';
import type { CollectOptions, Collector, CollectResult } from './types';

const MINISTERS_URL = 'https://www.dia.govt.nz/Ministers-expense-releases';

/**
 * Best-effort collector for Ministers' expense releases from the Department of
 * Internal Affairs. Parses linked release tables where reachable and degrades to
 * an empty dataset (with a warning) if the source cannot be read.
 */
async function run(options: CollectOptions): Promise<CollectResult<Expense>> {
  const fetchedAt = new Date().toISOString();
  const records: Expense[] = [];

  let html: string;
  try {
    html = await fetchText(MINISTERS_URL, { force: options.force });
  } catch (error) {
    console.warn(`  ! Minister expenses source unavailable: ${(error as Error).message}`);
    return { records, sources: [MINISTERS_URL] };
  }

  const $ = cheerio.load(html);
  $('table').each((_, table) => {
    const headers = $(table)
      .find('th')
      .map((_i, th) => clean($(th).text())?.toLowerCase() ?? '')
      .get();
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
        records.push({
          mpId: null,
          ministerName: cells[0],
          period: '',
          category: toExpenseCategory(cells[0]),
          amount,
          description: cells.join(' | '),
          sourceUrl: MINISTERS_URL,
          fetchedAt,
        });
      });
  });

  if (records.length === 0) {
    console.warn('  ! No minister expense tables parsed (source may require a browser).');
  }
  return { records, sources: [MINISTERS_URL] };
}

export const ministersCollector: Collector<Expense> = {
  domain: 'ministers',
  describe: "Ministers' expense releases (dia.govt.nz, best-effort)",
  run,
};
