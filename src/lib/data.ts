import 'server-only';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { billSubjects } from '@/lib/bill-subjects';
import { PARLIAMENT_TERMS, type ParliamentTerm } from '@/lib/parliament-data';
import { canonicalParty, partyColor, partySlug } from '@/lib/party';
import { formatQuarterFull } from '@/lib/utils';
import type {
  Bill,
  Dataset,
  Domain,
  Expense,
  MP,
  MpEnrichment,
  NewsArticle,
  Poll,
  SpendingYear,
  Vote,
  VoteValue,
} from '@/types/records';

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
export const getPolls = () => loadDataset<Poll>('polls');
/** Annual Crown spending & GDP from the Treasury Fiscal Time Series, oldest-first. */
export async function getSpending(): Promise<Dataset<SpendingYear>> {
  const dataset = await loadDataset<SpendingYear>('spending');
  return {
    ...dataset,
    records: [...dataset.records].sort((a, b) => a.year - b.year),
  };
}

/** Look up a single MP by id. */
export async function getMp(mpId: string): Promise<MP | null> {
  const { records } = await getMps();
  return records.find((mp) => mp.mpId === mpId) ?? null;
}

/** Wikipedia-sourced enrichment records (bio, description, portrait). */
export async function getEnrichment(): Promise<MpEnrichment[]> {
  try {
    const raw = await readFile(join(DATA_DIR, 'enrichment.json'), 'utf8');
    return (JSON.parse(raw) as Dataset<MpEnrichment>).records;
  } catch {
    return [];
  }
}

/** Enrichment for a single MP, if available. */
export async function getMpEnrichment(mpId: string): Promise<MpEnrichment | null> {
  const records = await getEnrichment();
  return records.find((e) => e.mpId === mpId) ?? null;
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

export interface ExpenseCoverage {
  first: string | null;
  last: string | null;
  quarters: number;
}

/** Date-range coverage of a set of expense records, by distinct period (oldest → newest). */
export function expenseCoverage(expenses: Expense[]): ExpenseCoverage {
  const periods = [...new Set(expenses.map((e) => e.period))].sort((a, b) => a.localeCompare(b));
  return {
    first: periods[0] ?? null,
    last: periods[periods.length - 1] ?? null,
    quarters: periods.length,
  };
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

/** The parties charted individually in the composition-over-time series. */
const COMPOSITION_PARTIES = [
  'National',
  'Labour',
  'Green',
  'ACT',
  'New Zealand First',
  'Te Pāti Māori',
];

export interface CompositionPoint {
  year: number;
  [party: string]: number;
}

/**
 * Seats per major party at each election, with minor parties folded into
 * "Other" — shaped for a stacked area chart of Parliament's make-up over time.
 */
export function seatCompositionSeries(): { data: CompositionPoint[]; parties: string[] } {
  const data = PARLIAMENT_TERMS.map((term) => {
    const point: CompositionPoint = { year: term.year };
    for (const party of COMPOSITION_PARTIES) point[party] = 0;
    let other = 0;
    for (const p of term.parties) {
      const canon = canonicalParty(p.party);
      if (COMPOSITION_PARTIES.includes(canon)) point[canon] += p.seats;
      else other += p.seats;
    }
    point.Other = other;
    return point;
  });
  return { data, parties: [...COMPOSITION_PARTIES, 'Other'] };
}

export interface SeatTypeSplit {
  type: string;
  value: number;
}

/** Split current MPs into electorate vs list seats. */
export function electorateListSplit(mps: MP[]): SeatTypeSplit[] {
  let list = 0;
  let electorate = 0;
  for (const mp of mps) {
    if (!mp.electorate || /^list$/i.test(mp.electorate)) list += 1;
    else electorate += 1;
  }
  return [
    { type: 'Electorate', value: electorate },
    { type: 'List', value: list },
  ];
}

// ---------------------------------------------------------------------------
// Polls
// ---------------------------------------------------------------------------

/**
 * Current party leaders, tying each polled party to a tracked MP. This is the
 * relationship that links the polls module to the politicians module.
 */
export interface PartyLeader {
  mpId: string;
  name: string;
}

const PARTY_LEADERS: Record<string, PartyLeader> = {
  National: { mpId: 'luxon-christopher', name: 'Christopher Luxon' },
  Labour: { mpId: 'hipkins-chris', name: 'Chris Hipkins' },
  Green: { mpId: 'swarbrick-chloe', name: 'Chlöe Swarbrick' },
  ACT: { mpId: 'seymour-david', name: 'David Seymour' },
  'New Zealand First': { mpId: 'peters-winston', name: 'Winston Peters' },
  'Te Pāti Māori': { mpId: 'waititi-rawiri', name: 'Rawiri Waititi' },
};

/** The party leader (as a tracked MP) for a canonical party name, if known. */
export function partyLeader(party: string): PartyLeader | null {
  return PARTY_LEADERS[canonicalParty(party)] ?? null;
}

/** Party-vote threshold (%) for list seats under NZ's MMP rules. */
const PARTY_VOTE_THRESHOLD = 5;
/** Nominal size of the House used for seat projections. */
const HOUSE_SEATS = 120;

/** Polls sorted newest-first by end date. */
function sortedPolls(polls: Poll[]): Poll[] {
  return [...polls].sort((a, b) => (b.endDate ?? '').localeCompare(a.endDate ?? ''));
}

/** The single most recent poll, or null when none are available. */
export function latestPoll(polls: Poll[]): Poll | null {
  return sortedPolls(polls)[0] ?? null;
}

export interface PollAverage {
  party: string;
  code: string;
  percentage: number;
}

/**
 * A "poll of polls": the mean party-vote support across the most recent `sample`
 * polls, ranked by support. Parties absent from a poll are simply skipped for
 * that poll's average.
 */
export function pollAverage(polls: Poll[], sample = 6): PollAverage[] {
  const recent = sortedPolls(polls).slice(0, sample);
  const totals = new Map<string, { code: string; sum: number; count: number }>();
  for (const poll of recent) {
    for (const result of poll.results) {
      if (result.percentage === null) continue;
      const entry = totals.get(result.party) ?? { code: result.code, sum: 0, count: 0 };
      entry.sum += result.percentage;
      entry.count += 1;
      totals.set(result.party, entry);
    }
  }
  return [...totals.entries()]
    .map(([party, { code, sum, count }]) => ({
      party,
      code,
      percentage: Math.round((sum / count) * 10) / 10,
    }))
    .sort((a, b) => b.percentage - a.percentage);
}

/** The major parties charted on the polling trend line. */
const TREND_PARTIES = ['National', 'Labour', 'Green', 'ACT', 'New Zealand First', 'Te Pāti Māori'];

export interface PollTrendPoint {
  date: string;
  [party: string]: string | number | null;
}

/** A time series of party-vote support per poll, oldest first, for line charts. */
export function pollTrend(polls: Poll[], parties: string[] = TREND_PARTIES): PollTrendPoint[] {
  return sortedPolls(polls)
    .filter((poll) => poll.endDate)
    .reverse()
    .map((poll) => {
      const byParty = new Map(poll.results.map((r) => [r.party, r.percentage]));
      const point: PollTrendPoint = { date: poll.endDate as string };
      for (const party of parties) point[party] = byParty.get(party) ?? null;
      return point;
    });
}

export interface SeatProjection {
  party: string;
  percentage: number;
  seats: number;
}

/**
 * Project list seats from party-vote percentages using the Sainte-Laguë method
 * with the 5% threshold, across a 120-seat House. This is an approximation: it
 * ignores electorate-seat exemptions and overhang, and is labelled as such.
 */
export function projectSeats(averages: PollAverage[]): SeatProjection[] {
  const eligible = averages.filter((a) => a.percentage >= PARTY_VOTE_THRESHOLD);
  const seats = new Map<string, number>(eligible.map((a) => [a.party, 0]));

  for (let allocated = 0; allocated < HOUSE_SEATS; allocated += 1) {
    let bestParty: string | null = null;
    let bestQuotient = -1;
    for (const a of eligible) {
      const quotient = a.percentage / (2 * (seats.get(a.party) ?? 0) + 1);
      if (quotient > bestQuotient) {
        bestQuotient = quotient;
        bestParty = a.party;
      }
    }
    if (!bestParty) break;
    seats.set(bestParty, (seats.get(bestParty) ?? 0) + 1);
  }

  return eligible
    .map((a) => ({ party: a.party, percentage: a.percentage, seats: seats.get(a.party) ?? 0 }))
    .sort((a, b) => b.seats - a.seats);
}

/** Seats a party currently holds in the most recent Parliament. */
function currentSeatsForParty(canonName: string): number {
  const latest = PARLIAMENT_TERMS[PARLIAMENT_TERMS.length - 1];
  return seatsInTerm(latest, canonName);
}

export interface PollPartyRow {
  party: string;
  code: string;
  slug: string;
  color: string;
  percentage: number;
  projectedSeats: number;
  currentSeats: number;
  leader: PartyLeader | null;
}

/** Distinct election cycles present in the dataset, newest first. */
export function pollElections(polls: Poll[]): string[] {
  return [...new Set(polls.map((p) => p.election))].sort((a, b) => b.localeCompare(a));
}

/** A trimmed poll shape for the recent-polls table on the client. */
export interface RecentPoll {
  pollId: string;
  pollster: string;
  endDate: string | null;
  sampleSize: number | null;
  results: { party: string; code: string; percentage: number | null }[];
}

export interface ElectionSummary {
  election: string;
  /** True for the upcoming cycle — enables leader and current-seat columns. */
  isCurrent: boolean;
  totalPolls: number;
  pollsters: number;
  dateRange: { from: string | null; to: string | null };
  latestPollster: string | null;
  latestDate: string | null;
  leadParty: string | null;
  leadPct: number | null;
  average: PollPartyRow[];
  projection: SeatProjection[];
  projectedTotalSeats: number;
  trend: PollTrendPoint[];
  trendParties: string[];
  recent: RecentPoll[];
}

/** Build the full polling summary for a single election cycle. */
function buildElectionSummary(all: Poll[], election: string, isCurrent: boolean): ElectionSummary {
  const polls = all.filter((p) => p.election === election);
  const averages = pollAverage(polls);
  const projection = projectSeats(averages);
  const seatsByParty = new Map(projection.map((p) => [p.party, p.seats]));

  const average: PollPartyRow[] = averages.map((a) => {
    const canon = canonicalParty(a.party);
    return {
      party: a.party,
      code: a.code,
      slug: partySlug(a.party),
      color: partyColor(a.party),
      percentage: a.percentage,
      projectedSeats: seatsByParty.get(a.party) ?? 0,
      currentSeats: isCurrent ? currentSeatsForParty(canon) : 0,
      leader: isCurrent ? partyLeader(a.party) : null,
    };
  });

  const ordered = sortedPolls(polls);
  const trendParties = average.slice(0, 6).map((row) => row.party);

  return {
    election,
    isCurrent,
    totalPolls: polls.length,
    pollsters: new Set(polls.map((p) => p.pollster)).size,
    dateRange: {
      from: ordered[ordered.length - 1]?.endDate ?? null,
      to: ordered[0]?.endDate ?? null,
    },
    latestPollster: ordered[0]?.pollster ?? null,
    latestDate: ordered[0]?.endDate ?? null,
    leadParty: average[0]?.party ?? null,
    leadPct: average[0]?.percentage ?? null,
    average,
    projection,
    projectedTotalSeats: projection.reduce((sum, p) => sum + p.seats, 0),
    trend: pollTrend(polls, trendParties),
    trendParties,
    recent: ordered.slice(0, 15).map((p) => ({
      pollId: p.pollId,
      pollster: p.pollster,
      endDate: p.endDate,
      sampleSize: p.sampleSize,
      results: p.results,
    })),
  };
}

export interface PollsExplorerData {
  elections: string[];
  summaries: ElectionSummary[];
  totalPolls: number;
  pollsters: number;
  /** Support for the major parties across every cycle, for the compare view. */
  fullTrend: PollTrendPoint[];
  fullTrendParties: string[];
}

/** Composed, per-cycle polling data for the polls landing page. */
export async function getPollsExplorer(): Promise<PollsExplorerData> {
  const { records: polls } = await getPolls();
  const elections = pollElections(polls);
  const summaries = elections.map((election, index) =>
    buildElectionSummary(polls, election, index === 0),
  );
  return {
    elections,
    summaries,
    totalPolls: polls.length,
    pollsters: new Set(polls.map((p) => p.pollster)).size,
    fullTrend: pollTrend(polls, TREND_PARTIES),
    fullTrendParties: TREND_PARTIES,
  };
}

export interface PartyPolling {
  average: number | null;
  latest: number | null;
  projectedSeats: number;
  currentSeats: number;
  color: string;
  trend: { date: string; percentage: number }[];
}

/**
 * Polling detail for a single party, keyed by canonical name. Powers the
 * "In the polls" card on each party page — the parties↔polls relationship.
 * Scoped to the current (upcoming) election cycle so averages aren't mixed
 * across historical campaigns.
 */
export async function getPartyPolling(canonName: string): Promise<PartyPolling | null> {
  const { records: all } = await getPolls();
  if (all.length === 0) return null;
  const current = pollElections(all)[0];
  const polls = all.filter((p) => p.election === current);

  const averages = pollAverage(polls);
  const match = averages.find((a) => canonicalParty(a.party) === canonName);
  const projection = projectSeats(averages);
  const projected = projection.find((p) => canonicalParty(p.party) === canonName);

  const trend = pollTrend(polls, [canonName])
    .map((point) => ({ date: point.date, percentage: point[canonName] }))
    .filter((p): p is { date: string; percentage: number } => typeof p.percentage === 'number');

  if (!match && trend.length === 0) return null;

  const latest = latestPoll(polls)?.results.find((r) => canonicalParty(r.party) === canonName);

  return {
    average: match?.percentage ?? null,
    latest: latest?.percentage ?? null,
    projectedSeats: projected?.seats ?? 0,
    currentSeats: currentSeatsForParty(canonName),
    color: partyColor(canonName),
    trend,
  };
}

// ---------------------------------------------------------------------------
// News
// ---------------------------------------------------------------------------

/** Politics articles from RNZ & NZ Herald, cross-referenced to MPs, newest first. */
export async function getNews(): Promise<Dataset<NewsArticle>> {
  const dataset = await loadDataset<NewsArticle>('news');
  return {
    ...dataset,
    records: [...dataset.records].sort((a, b) =>
      (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''),
    ),
  };
}

/** A news article with its matched MPs resolved to name/party for display. */
export interface NewsArticleView extends NewsArticle {
  mentioned: { mpId: string; name: string; party: string | null }[];
}

/** Attach resolved MP details to each article's `mentions`. */
export function withMentionedMps(articles: NewsArticle[], mps: MP[]): NewsArticleView[] {
  const byId = new Map(mps.map((m) => [m.mpId, m]));
  return articles.map((article) => ({
    ...article,
    mentioned: article.mentions
      .map((mpId) => {
        const mp = byId.get(mpId);
        return mp ? { mpId, name: mp.name, party: mp.party } : null;
      })
      .filter((m): m is { mpId: string; name: string; party: string | null } => m !== null),
  }));
}

/** Recent articles that mention a given MP, newest first. */
export async function getNewsForMp(mpId: string, limit = 6): Promise<NewsArticle[]> {
  const { records } = await getNews();
  return records.filter((a) => a.mentions.includes(mpId)).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Activity timeline (votes · expenses · news, merged chronologically)
// ---------------------------------------------------------------------------

export type TimelineKind = 'vote' | 'expense' | 'news';

/** A single dated event on an MP's activity timeline. */
export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  /** ISO `YYYY-MM-DD` used for ordering and display. */
  date: string;
  title: string;
  /** Secondary line (vote position, expense breakdown, source/author). */
  detail: string | null;
  /** Internal link (e.g. to a bill), when applicable. */
  href: string | null;
  /** External link (news article), when applicable. */
  url: string | null;
  /** Vote position, for colouring vote events. */
  vote: VoteValue | null;
  /** Source label for news events. */
  source: string | null;
  /** Total amount for expense events, in NZD. */
  amount: number | null;
}

/** Map a `YYYY-QN` expense period to the ISO date of that quarter's end. */
function quarterEndIso(period: string): string {
  const match = period.match(/^(\d{4})-Q([1-4])$/);
  if (!match) return period;
  const ends = ['03-31', '06-30', '09-30', '12-31'];
  return `${match[1]}-${ends[Number(match[2]) - 1]}`;
}

const CATEGORY_LABELS: Record<string, string> = {
  travel: 'Travel',
  accommodation: 'Accommodation',
  other: 'Other',
};

export interface MpTimelineData {
  votes: Vote[];
  bills: Bill[];
  expenses: Expense[];
  news: NewsArticle[];
}

/**
 * Merge an MP's votes, quarterly expenses, and news mentions into a single
 * chronological timeline, newest first. Expenses are aggregated per quarter so a
 * period appears as one event rather than many category rows.
 */
export function buildMpTimeline(mpId: string, data: MpTimelineData, limit = 80): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const billTitleById = new Map(data.bills.map((b) => [b.billId, b.title]));

  for (const vote of data.votes) {
    if (vote.mpId !== mpId || !vote.date) continue;
    const title = (vote.billId ? billTitleById.get(vote.billId) : null) ?? vote.issue ?? 'Division';
    const position =
      vote.vote === 'aye'
        ? 'Voted Aye'
        : vote.vote === 'nay'
          ? 'Voted No'
          : vote.vote === 'absent'
            ? 'Absent'
            : 'Vote recorded';
    events.push({
      id: `vote-${vote.voteId}`,
      kind: 'vote',
      date: vote.date,
      title,
      detail: vote.stage ? `${position} · ${vote.stage}` : position,
      href: vote.billId ? `/bills/${vote.billId}` : null,
      url: null,
      vote: vote.vote,
      source: null,
      amount: null,
    });
  }

  const byPeriod = new Map<string, { total: number; byCategory: Map<string, number> }>();
  for (const expense of data.expenses) {
    if (expense.mpId !== mpId) continue;
    const entry = byPeriod.get(expense.period) ?? { total: 0, byCategory: new Map() };
    const amount = expense.amount ?? 0;
    entry.total += amount;
    entry.byCategory.set(expense.category, (entry.byCategory.get(expense.category) ?? 0) + amount);
    byPeriod.set(expense.period, entry);
  }
  for (const [period, { total, byCategory }] of byPeriod) {
    const breakdown = [...byCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([category]) => CATEGORY_LABELS[category] ?? category)
      .join(' · ');
    events.push({
      id: `expense-${period}`,
      kind: 'expense',
      date: quarterEndIso(period),
      title: `${formatQuarterFull(period)} expenses`,
      detail: breakdown || null,
      href: null,
      url: null,
      vote: null,
      source: null,
      amount: total,
    });
  }

  for (const article of data.news) {
    if (!article.mentions.includes(mpId) || !article.publishedAt) continue;
    events.push({
      id: `news-${article.articleId}`,
      kind: 'news',
      date: article.publishedAt,
      title: article.title,
      detail: article.author ? `${article.source} · ${article.author}` : article.source,
      href: null,
      url: article.url,
      vote: null,
      source: article.source,
      amount: null,
    });
  }

  return events.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Bills stats
// ---------------------------------------------------------------------------

export interface VoterRank {
  mpId: string;
  name: string;
  party: string | null;
  count: number;
}

/** Top MPs by number of votes cast with a given value (aye/nay/absent). */
export function topVotersByValue(votes: Vote[], value: VoteValue, limit = 5): VoterRank[] {
  const byMp = new Map<string, VoterRank>();
  for (const vote of votes) {
    if (vote.vote !== value || !vote.mpId) continue;
    const entry =
      byMp.get(vote.mpId) ??
      ({ mpId: vote.mpId, name: vote.name ?? vote.mpId, party: vote.party, count: 0 } as VoterRank);
    entry.count += 1;
    byMp.set(vote.mpId, entry);
  }
  return [...byMp.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

export interface ProponentRank {
  mpId: string | null;
  name: string;
  count: number;
}

/**
 * Top bill sponsors by number of bills introduced. Sponsor/proponent data is
 * not currently exposed by the source, so this is typically empty; it will
 * populate automatically once `proponentName` is collected.
 */
export function topBillProponents(bills: Bill[], limit = 5): ProponentRank[] {
  const byKey = new Map<string, ProponentRank>();
  for (const bill of bills) {
    if (!bill.proponentName) continue;
    const key = bill.proponentMpId ?? bill.proponentName;
    const entry =
      byKey.get(key) ??
      ({ mpId: bill.proponentMpId, name: bill.proponentName, count: 0 } as ProponentRank);
    entry.count += 1;
    byKey.set(key, entry);
  }
  return [...byKey.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

export interface SubjectRank {
  subject: string;
  count: number;
}

/** Most common bill subjects, by number of bills tagged with each. */
export function topBillSubjects(bills: Bill[], limit = 5): SubjectRank[] {
  const counts = new Map<string, number>();
  for (const bill of bills) {
    for (const subject of billSubjects(bill)) {
      counts.set(subject, (counts.get(subject) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([subject, count]) => ({ subject, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
