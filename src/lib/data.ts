import 'server-only';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PARLIAMENT_TERMS, type ParliamentTerm } from '@/lib/parliament-data';
import { canonicalParty, partyColor, partySlug } from '@/lib/party';
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

/** Look up a single MP by id. */
export async function getMp(mpId: string): Promise<MP | null> {
  const { records } = await getMps();
  return records.find((mp) => mp.mpId === mpId) ?? null;
}

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

export interface BillRank {
  billId: string;
  title: string;
  divisions: number;
}

/** Rank bills by how many recorded divisions (votes) they attracted. */
export function rankBillsByDivisions(bills: Bill[], votes: Vote[]): BillRank[] {
  const counts = new Map<string, number>();
  for (const vote of votes) {
    if (!vote.billId) continue;
    counts.set(vote.billId, (counts.get(vote.billId) ?? 0) + 1);
  }
  return bills
    .map((bill) => ({
      billId: bill.billId,
      title: bill.title,
      divisions: counts.get(bill.billId) ?? 0,
    }))
    .sort((a, b) => b.divisions - a.divisions);
}

// ---------------------------------------------------------------------------
// Bills
// ---------------------------------------------------------------------------

/** Look up a single bill by id. */
export async function getBill(billId: string): Promise<Bill | null> {
  const { records } = await getBills();
  return records.find((bill) => bill.billId === billId) ?? null;
}

export interface BillVoteBreakdown {
  voteId: string;
  issue: string | null;
  date: string | null;
  stage: string | null;
  ayes: number;
  noes: number;
  votes: Vote[];
}

/** Group all recorded votes for a bill into its individual divisions. */
export function divisionsForBill(billId: string, votes: Vote[]): BillVoteBreakdown[] {
  const byDivision = new Map<string, Vote[]>();
  for (const vote of votes) {
    if (vote.billId !== billId) continue;
    const list = byDivision.get(vote.voteId) ?? [];
    list.push(vote);
    byDivision.set(vote.voteId, list);
  }
  return [...byDivision.entries()]
    .map(([voteId, group]) => ({
      voteId,
      issue: group[0]?.issue ?? null,
      date: group[0]?.date ?? null,
      stage: group[0]?.stage ?? null,
      ayes: group.filter((v) => v.vote === 'aye').length,
      noes: group.filter((v) => v.vote === 'nay').length,
      votes: group,
    }))
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
}

// ---------------------------------------------------------------------------
// Votes (per MP)
// ---------------------------------------------------------------------------

export interface MpVoteGroup {
  billId: string;
  billTitle: string;
  ayes: number;
  noes: number;
  votes: Vote[];
}

/** All votes cast by a given MP, newest first. */
export function votesForMp(mpId: string, votes: Vote[]): Vote[] {
  return votes
    .filter((v) => v.mpId === mpId)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
}

/** Group an MP's votes by bill, with a resolved bill title. */
export function groupMpVotesByBill(mpId: string, votes: Vote[], bills: Bill[]): MpVoteGroup[] {
  const titleById = new Map(bills.map((b) => [b.billId, b.title]));
  const groups = new Map<string, Vote[]>();
  for (const vote of votes) {
    if (vote.mpId !== mpId || !vote.billId) continue;
    const list = groups.get(vote.billId) ?? [];
    list.push(vote);
    groups.set(vote.billId, list);
  }
  return [...groups.entries()]
    .map(([billId, group]) => ({
      billId,
      billTitle: titleById.get(billId) ?? billId,
      ayes: group.filter((v) => v.vote === 'aye').length,
      noes: group.filter((v) => v.vote === 'nay').length,
      votes: group.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    }))
    .sort((a, b) => b.votes.length - a.votes.length);
}

// ---------------------------------------------------------------------------
// Expenses (money)
// ---------------------------------------------------------------------------

export interface CategoryTotal {
  category: string;
  amount: number;
}

export interface PeriodTotal {
  period: string;
  amount: number;
}

export interface MpSpend {
  total: number;
  byCategory: CategoryTotal[];
  byPeriod: PeriodTotal[];
}

/** Summarise a single MP's spending across categories and quarters. */
export function summariseMpSpend(mpId: string, expenses: Expense[]): MpSpend {
  const rows = expenses.filter((e) => e.mpId === mpId);
  const byCategory = new Map<string, number>();
  const byPeriod = new Map<string, number>();
  let total = 0;
  for (const e of rows) {
    const amount = e.amount ?? 0;
    total += amount;
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + amount);
    byPeriod.set(e.period, (byPeriod.get(e.period) ?? 0) + amount);
  }
  return {
    total,
    byCategory: [...byCategory.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
    byPeriod: [...byPeriod.entries()]
      .map(([period, amount]) => ({ period, amount }))
      .sort((a, b) => a.period.localeCompare(b.period)),
  };
}

export interface SpenderRank {
  mpId: string;
  name: string;
  party: string | null;
  total: number;
}

/** Rank MPs by total recorded spend (matched records only). */
export function rankTopSpenders(expenses: Expense[], mps: MP[], limit = 10): SpenderRank[] {
  const totals = new Map<string, number>();
  for (const e of expenses) {
    if (!e.mpId) continue;
    totals.set(e.mpId, (totals.get(e.mpId) ?? 0) + (e.amount ?? 0));
  }
  const byId = new Map(mps.map((m) => [m.mpId, m]));
  return [...totals.entries()]
    .map(([mpId, total]) => {
      const mp = byId.get(mpId);
      return { mpId, name: mp?.name ?? mpId, party: mp?.party ?? null, total };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

/** Total recorded spend grouped by party. */
export function spendByParty(expenses: Expense[], mps: MP[]): CategoryTotal[] {
  const partyById = new Map(mps.map((m) => [m.mpId, m.party]));
  const totals = new Map<string, number>();
  for (const e of expenses) {
    if (!e.mpId) continue;
    const party = partyById.get(e.mpId);
    if (!party) continue;
    totals.set(party, (totals.get(party) ?? 0) + (e.amount ?? 0));
  }
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/** Total recorded spend grouped by category. */
export function spendByCategory(expenses: Expense[]): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const e of expenses) {
    totals.set(e.category, (totals.get(e.category) ?? 0) + (e.amount ?? 0));
  }
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/** Total recorded spend per quarter, oldest first (for trend charts). */
export function spendByPeriod(expenses: Expense[]): PeriodTotal[] {
  const totals = new Map<string, number>();
  for (const e of expenses) {
    totals.set(e.period, (totals.get(e.period) ?? 0) + (e.amount ?? 0));
  }
  return [...totals.entries()]
    .map(([period, amount]) => ({ period, amount }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

// ---------------------------------------------------------------------------
// Parties
// ---------------------------------------------------------------------------

function seatsInTerm(term: ParliamentTerm, canonName: string): number {
  return term.parties
    .filter((p) => canonicalParty(p.party) === canonName)
    .reduce((sum, p) => sum + p.seats, 0);
}

function governedInTerm(term: ParliamentTerm, canonName: string): boolean {
  return term.government.some((g) => canonicalParty(g) === canonName);
}

export interface SeatHistoryPoint {
  year: number;
  seats: number;
  totalSeats: number;
}

export interface PartySummary {
  party: string;
  slug: string;
  color: string;
  mpCount: number;
  /** Seats in the most recent Parliament, or null if the party isn't seated there. */
  currentSeats: number | null;
  peakSeats: number;
  peakYear: number | null;
  termsSeated: number;
  termsInGovernment: number;
  inGovernmentNow: boolean;
}

function summarise(canonName: string, mps: MP[]): PartySummary {
  const mpCount = mps.filter((m) => m.party && canonicalParty(m.party) === canonName).length;

  let peakSeats = 0;
  let peakYear: number | null = null;
  let termsSeated = 0;
  let termsInGovernment = 0;
  for (const term of PARLIAMENT_TERMS) {
    const seats = seatsInTerm(term, canonName);
    if (seats > 0) {
      termsSeated += 1;
      if (seats > peakSeats) {
        peakSeats = seats;
        peakYear = term.year;
      }
    }
    if (governedInTerm(term, canonName)) termsInGovernment += 1;
  }

  const latest = PARLIAMENT_TERMS[PARLIAMENT_TERMS.length - 1];
  const latestSeats = seatsInTerm(latest, canonName);

  return {
    party: canonName,
    slug: partySlug(canonName),
    color: partyColor(canonName),
    mpCount,
    currentSeats: latestSeats > 0 ? latestSeats : null,
    peakSeats,
    peakYear,
    termsSeated,
    termsInGovernment,
    inGovernmentNow: governedInTerm(latest, canonName),
  };
}

/** Union of all party names known to the MP dataset and the historical terms. */
function partyUniverse(mps: MP[]): string[] {
  const names = new Set<string>();
  for (const mp of mps) if (mp.party) names.add(canonicalParty(mp.party));
  for (const term of PARLIAMENT_TERMS) {
    for (const p of term.parties) names.add(canonicalParty(p.party));
  }
  return [...names];
}

/** Summaries for every party, ranked by current seats then tracked MPs. */
export async function getPartySummaries(): Promise<PartySummary[]> {
  const { records: mps } = await getMps();
  return partyUniverse(mps)
    .map((name) => summarise(name, mps))
    .sort(
      (a, b) =>
        (b.currentSeats ?? -1) - (a.currentSeats ?? -1) ||
        b.peakSeats - a.peakSeats ||
        b.mpCount - a.mpCount ||
        a.party.localeCompare(b.party),
    );
}

export interface PrimeMinisterSpell {
  name: string;
  years: number[];
}

export interface PartyDetail {
  summary: PartySummary;
  mps: MP[];
  seatHistory: SeatHistoryPoint[];
  governmentTerms: ParliamentTerm[];
  primeMinisters: PrimeMinisterSpell[];
}

/** Full detail for a single party, resolved by slug. */
export async function getPartyDetail(slug: string): Promise<PartyDetail | null> {
  const { records: mps } = await getMps();
  const canonName = partyUniverse(mps).find((name) => partySlug(name) === slug);
  if (!canonName) return null;

  const partyMps = mps
    .filter((m) => m.party && canonicalParty(m.party) === canonName)
    .sort((a, b) => a.name.localeCompare(b.name));

  const seatHistory: SeatHistoryPoint[] = PARLIAMENT_TERMS.map((term) => ({
    year: term.year,
    seats: seatsInTerm(term, canonName),
    totalSeats: term.totalSeats,
  }));

  const governmentTerms = PARLIAMENT_TERMS.filter((term) => governedInTerm(term, canonName));

  const pmMap = new Map<string, Set<number>>();
  for (const term of PARLIAMENT_TERMS) {
    if (canonicalParty(term.pmParty) !== canonName) continue;
    const years = pmMap.get(term.primeMinister) ?? new Set<number>();
    years.add(term.year);
    pmMap.set(term.primeMinister, years);
  }
  const primeMinisters: PrimeMinisterSpell[] = [...pmMap.entries()]
    .map(([name, years]) => ({ name, years: [...years].sort() }))
    .sort((a, b) => a.years[0] - b.years[0]);

  return {
    summary: summarise(canonName, mps),
    mps: partyMps,
    seatHistory,
    governmentTerms,
    primeMinisters,
  };
}
