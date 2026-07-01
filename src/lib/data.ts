import 'server-only';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Bill, Dataset, Domain, Expense, MP, Vote } from '@/types/records';

const DATA_DIR = join(process.cwd(), 'data');

async function loadDataset<T>(domain: Domain): Promise<Dataset<T>> {
  try {
    const raw = await readFile(join(DATA_DIR, `${domain}.json`), 'utf8');
    return JSON.parse(raw) as Dataset<T>;
  } catch {
    return {
      meta: { domain, count: 0, collectedAt: '', sources: [] },
      records: [],
    };
  }
}

export const getMps = () => loadDataset<MP>('mps');
export const getBills = () => loadDataset<Bill>('bills');
export const getVotes = () => loadDataset<Vote>('votes');
export const getExpenses = () => loadDataset<Expense>('expenses');
export const getMinisterExpenses = () => loadDataset<Expense>('ministers');

export interface PartyCount {
  party: string;
  count: number;
}

/** Aggregate MPs by canonical party, sorted by descending count. */
export function countByParty(mps: MP[]): PartyCount[] {
  const counts = new Map<string, number>();
  for (const mp of mps) {
    const party = mp.party ?? 'Unaligned';
    counts.set(party, (counts.get(party) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([party, count]) => ({ party, count }))
    .sort((a, b) => b.count - a.count);
}
