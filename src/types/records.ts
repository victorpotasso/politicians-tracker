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

export type Domain = 'mps' | 'bills' | 'votes' | 'expenses' | 'ministers';

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
