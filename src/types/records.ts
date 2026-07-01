/**
 * Canonical normalized record types for NZ political data.
 * Field names follow the nz-politics-data-collector schema and must not be
 * renamed per source. Every record carries provenance (`sourceUrl`).
 */

export type VoteValue = 'aye' | 'nay' | 'absent';
export type YesNoNull = 'yes' | 'no' | null;
export type ExpenseCategory = 'travel' | 'accommodation' | 'other';
export type ExpensePeriod = string; // `YYYY-QN` or `YYYY-MM`
export type IsoDate = string; // `YYYY-MM-DD`

export interface Provenance {
  /** Canonical source URL for auditing the origin of the record. */
  sourceUrl: string;
  /** ISO 8601 timestamp of when the record was fetched. */
  fetchedAt: string;
}

export interface MP extends Provenance {
  mpId: string;
  name: string;
  party: string | null;
  electorate: string | null;
  role: string | null;
  firstElected: IsoDate | null;
  profileUrl: string | null;
  photoUrl: string | null;
}

export interface BillDocument {
  type: string;
  url: string;
  title: string;
}

export interface Bill extends Provenance {
  billId: string;
  title: string;
  abstract: string | null;
  stage: string | null;
  proponentMpId: string | null;
  proponentName: string | null;
  party: string | null;
  introducedDate: IsoDate | null;
  documents: BillDocument[];
}

export interface Expense extends Provenance {
  mpId: string | null;
  ministerName: string | null;
  period: ExpensePeriod;
  category: ExpenseCategory;
  amount: number | null;
  description: string | null;
}

export interface Vote extends Provenance {
  voteId: string;
  billId: string | null;
  issue: string | null;
  date: IsoDate | null;
  mpId: string | null;
  name: string | null;
  party: string | null;
  vote: VoteValue | null;
  partyVote: YesNoNull;
  individualVote: YesNoNull;
  stage: string | null;
}

/** A single party's headline party-vote result within an opinion poll. */
export interface PollResult {
  /** Canonical party name, linking the result to the parties module. */
  party: string;
  /** Source abbreviation as published (e.g. `NAT`, `LAB`). */
  code: string;
  /** Party-vote support, as a percentage, or null when not reported. */
  percentage: number | null;
}

export interface Poll extends Provenance {
  pollId: string;
  pollster: string;
  /** First day of fieldwork (ISO), or null when unknown. */
  startDate: IsoDate | null;
  /** Last day of fieldwork (ISO); polls are ordered by this date. */
  endDate: IsoDate | null;
  sampleSize: number | null;
  /** Election cycle the poll speaks to, e.g. `2026`. */
  election: string;
  results: PollResult[];
  /** Reported margin between the two leading parties, or null. */
  lead: number | null;
}

/** One functional class of Core Crown expenses (e.g. Health), in NZD millions. */
export interface SpendingCategory {
  /** Human-readable classification, e.g. `Social security and welfare`. */
  category: string;
  /** Spend for the class in NZD millions (can be negative, e.g. forex losses). */
  amount: number;
}

/**
 * A single fiscal year of Crown spending from the Treasury Fiscal Time Series.
 * All monetary values are in NZD millions. Fiscal years end 31 March up to 1989
 * and 30 June from 1990 onward (see `yearType`).
 */
export interface SpendingYear extends Provenance {
  /** Fiscal year end, e.g. `2025` = year ended 30 June 2025. */
  year: number;
  /** Accounting/reporting basis as published, e.g. `PBE Standards, June Years`. */
  basis: string;
  /** Whether the fiscal year ends in March (pre-1990) or June. */
  yearType: 'March' | 'June';
  /** Financial net expenditure (cash-era headline spend), NZD millions. */
  financialNetExpenditure: number | null;
  /** Core Crown expenses — the headline government-spending figure from 1994. */
  coreCrownExpenses: number | null;
  /** Total Crown expenses (includes Crown entities and SOEs), NZD millions. */
  totalCrownExpenses: number | null;
  /** Nominal GDP for the year, NZD millions, for spend-as-%-of-GDP. */
  nominalGdp: number | null;
  /** Functional breakdown of Core Crown expenses, where reported. */
  categories: SpendingCategory[];
}

export type Domain = 'mps' | 'bills' | 'votes' | 'expenses' | 'ministers' | 'polls' | 'spending';

export interface DatasetMeta {
  domain: Domain;
  count: number;
  collectedAt: string;
  sources: string[];
}

export interface Dataset<T> {
  meta: DatasetMeta;
  records: T[];
}

/**
 * Wikipedia-sourced enrichment for an MP: a short biography, description, and a
 * portrait/link. Keyed to an MP by `mpId`. Optional and non-authoritative —
 * always secondary to the official roster data.
 */
export interface MpEnrichment {
  mpId: string;
  wikipediaTitle: string | null;
  wikipediaUrl: string | null;
  /** One-line descriptor, e.g. "New Zealand Green Party politician". */
  description: string | null;
  /** Intro paragraph(s), plain text. */
  extract: string | null;
  /** Portrait image URL (also mirrored locally for MPs missing a photo). */
  imageUrl: string | null;
  sourceUrl: string;
  fetchedAt: string;
}
