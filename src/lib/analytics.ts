/**
 * Cross-cutting analytics helpers. Pure, client-safe functions that operate on
 * already-loaded datasets (no `server-only` imports), so the server page can
 * compute derived data and the client explorer can reuse the shared types.
 */
import { canonicalParty } from '@/lib/party';
import type { Expense, MP, Vote } from '@/types/records';

export type SeatType = 'electorate' | 'list';

/** A matched expense row joined with its MP's party and seat type. */
export interface EnrichedExpense {
  mpId: string;
  name: string;
  /** Canonical party name, or `Unaligned` when the MP has no party. */
  party: string;
  /** Electorate name for electorate MPs, or null for list MPs. */
  electorate: string | null;
  seatType: SeatType;
  period: string;
  category: string;
  amount: number;
}

/**
 * Join matched expenses onto MP party + seat type, dropping unmatched rows
 * (null `mpId`) so every row can be attributed to a real MP.
 */
export function enrichExpenses(expenses: Expense[], mps: MP[]): EnrichedExpense[] {
  const byId = new Map(mps.map((m) => [m.mpId, m]));
  const rows: EnrichedExpense[] = [];
  for (const e of expenses) {
    if (!e.mpId) continue;
    const mp = byId.get(e.mpId);
    if (!mp) continue;
    const electorate = mp.electorate;
    const isList = !electorate || electorate.toLowerCase() === 'list';
    rows.push({
      mpId: e.mpId,
      name: mp.name,
      party: mp.party ? canonicalParty(mp.party) : 'Unaligned',
      electorate: isList ? null : electorate,
      seatType: isList ? 'list' : 'electorate',
      period: e.period,
      category: e.category,
      amount: e.amount ?? 0,
    });
  }
  return rows;
}

/** Deviation from the MP's own-party majority across recorded divisions. */
export interface MpDeviation {
  mpId: string;
  name: string;
  party: string;
  /** Divisions where the MP voted aye/nay and their party had a clear position. */
  votesConsidered: number;
  deviations: number;
  /** Share of considered divisions where the MP broke from their party (0–1). */
  deviationRate: number;
}

/** How tightly a bill's divisions split along party lines. */
export interface BillCohesion {
  billId: string;
  issue: string;
  divisions: number;
  /** Share of party-aligned votes across the bill's divisions (0–1). */
  cohesion: number;
}

/** Party-level discipline aggregated from member deviations. */
export interface PartyDiscipline {
  party: string;
  mps: number;
  votesConsidered: number;
  deviations: number;
  /** Share of considered votes that broke party lines (0–1). */
  deviationRate: number;
}

export interface VotingDiscipline {
  mpDeviations: MpDeviation[];
  billCohesion: BillCohesion[];
  coverage: {
    mps: number;
    divisions: number;
    bills: number;
  };
}

/**
 * Derive party-line discipline from raw votes. Because `partyVote` is not
 * populated in the source data, the party's position on each division is
 * inferred from the majority of its members who voted aye/nay (absences and
 * exact ties yield no position and are skipped).
 */
export function computeVotingDiscipline(votes: Vote[], mps: MP[]): VotingDiscipline {
  const nameById = new Map(mps.map((m) => [m.mpId, m.name]));

  const byDivision = new Map<string, Vote[]>();
  for (const v of votes) {
    if (!v.voteId) continue;
    const list = byDivision.get(v.voteId) ?? [];
    list.push(v);
    byDivision.set(v.voteId, list);
  }

  const mpAgg = new Map<
    string,
    { name: string; party: string; considered: number; deviations: number }
  >();
  const billAgg = new Map<
    string,
    { issue: string; aligned: number; considered: number; divisions: Set<string> }
  >();

  for (const [voteId, group] of byDivision) {
    const partyTally = new Map<string, { aye: number; nay: number }>();
    for (const v of group) {
      if (!v.party || (v.vote !== 'aye' && v.vote !== 'nay')) continue;
      const canon = canonicalParty(v.party);
      const tally = partyTally.get(canon) ?? { aye: 0, nay: 0 };
      if (v.vote === 'aye') tally.aye += 1;
      else tally.nay += 1;
      partyTally.set(canon, tally);
    }

    const majority = new Map<string, 'aye' | 'nay'>();
    for (const [party, tally] of partyTally) {
      if (tally.aye === tally.nay) continue;
      majority.set(party, tally.aye > tally.nay ? 'aye' : 'nay');
    }

    const billId = group.find((v) => v.billId)?.billId ?? voteId;
    const issue = group.find((v) => v.issue)?.issue ?? billId;

    for (const v of group) {
      if (!v.mpId || !v.party || (v.vote !== 'aye' && v.vote !== 'nay')) continue;
      const canon = canonicalParty(v.party);
      const maj = majority.get(canon);
      if (!maj) continue;
      const aligned = v.vote === maj;

      const mp = mpAgg.get(v.mpId) ?? {
        name: nameById.get(v.mpId) ?? v.name ?? v.mpId,
        party: canon,
        considered: 0,
        deviations: 0,
      };
      mp.considered += 1;
      if (!aligned) mp.deviations += 1;
      mpAgg.set(v.mpId, mp);

      const bill = billAgg.get(billId) ?? {
        issue,
        aligned: 0,
        considered: 0,
        divisions: new Set<string>(),
      };
      bill.considered += 1;
      if (aligned) bill.aligned += 1;
      bill.divisions.add(voteId);
      billAgg.set(billId, bill);
    }
  }

  const mpDeviations: MpDeviation[] = [...mpAgg.entries()]
    .map(([mpId, a]) => ({
      mpId,
      name: a.name,
      party: a.party,
      votesConsidered: a.considered,
      deviations: a.deviations,
      deviationRate: a.considered ? a.deviations / a.considered : 0,
    }))
    .filter((d) => d.votesConsidered > 0)
    .sort((a, b) => b.deviationRate - a.deviationRate || b.votesConsidered - a.votesConsidered);

  const billCohesion: BillCohesion[] = [...billAgg.entries()]
    .map(([billId, a]) => ({
      billId,
      issue: a.issue,
      divisions: a.divisions.size,
      cohesion: a.considered ? a.aligned / a.considered : 0,
    }))
    .sort((a, b) => a.cohesion - b.cohesion);

  const allDivisions = new Set<string>();
  for (const a of billAgg.values()) for (const d of a.divisions) allDivisions.add(d);

  return {
    mpDeviations,
    billCohesion,
    coverage: {
      mps: mpDeviations.length,
      divisions: allDivisions.size,
      bills: billCohesion.length,
    },
  };
}

/** Aggregate member deviations into party-level discipline, least cohesive first. */
export function partyDiscipline(deviations: MpDeviation[]): PartyDiscipline[] {
  const byParty = new Map<string, { mps: number; considered: number; deviations: number }>();
  for (const d of deviations) {
    const agg = byParty.get(d.party) ?? { mps: 0, considered: 0, deviations: 0 };
    agg.mps += 1;
    agg.considered += d.votesConsidered;
    agg.deviations += d.deviations;
    byParty.set(d.party, agg);
  }
  return [...byParty.entries()]
    .map(([party, a]) => ({
      party,
      mps: a.mps,
      votesConsidered: a.considered,
      deviations: a.deviations,
      deviationRate: a.considered ? a.deviations / a.considered : 0,
    }))
    .sort((a, b) => b.deviationRate - a.deviationRate);
}
