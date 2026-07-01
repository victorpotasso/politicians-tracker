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

/** A single MP's combined money + voting profile, for cross-cutting rankings. */
export interface MpProfile {
  mpId: string;
  name: string;
  party: string;
  seatType: SeatType;
  total: number;
  travel: number;
  accommodation: number;
  other: number;
  quarters: number;
  votesConsidered: number;
  deviations: number;
  deviationRate: number;
}

/** Join expense totals with voting independence into one row per MP. */
export function mpCrossProfiles(rows: EnrichedExpense[], voting: VotingDiscipline): MpProfile[] {
  const byId = new Map<string, MpProfile>();
  const periods = new Map<string, Set<string>>();

  for (const r of rows) {
    const profile =
      byId.get(r.mpId) ??
      ({
        mpId: r.mpId,
        name: r.name,
        party: r.party,
        seatType: r.seatType,
        total: 0,
        travel: 0,
        accommodation: 0,
        other: 0,
        quarters: 0,
        votesConsidered: 0,
        deviations: 0,
        deviationRate: 0,
      } satisfies MpProfile);
    profile.total += r.amount;
    if (r.category === 'travel' || r.category === 'accommodation' || r.category === 'other') {
      profile[r.category] += r.amount;
    }
    byId.set(r.mpId, profile);

    const set = periods.get(r.mpId) ?? new Set<string>();
    set.add(r.period);
    periods.set(r.mpId, set);
  }

  for (const [mpId, set] of periods) {
    const profile = byId.get(mpId);
    if (profile) profile.quarters = set.size;
  }

  const votingById = new Map(voting.mpDeviations.map((d) => [d.mpId, d]));
  for (const d of voting.mpDeviations) {
    if (byId.has(d.mpId)) continue;
    byId.set(d.mpId, {
      mpId: d.mpId,
      name: d.name,
      party: d.party,
      seatType: 'list',
      total: 0,
      travel: 0,
      accommodation: 0,
      other: 0,
      quarters: 0,
      votesConsidered: 0,
      deviations: 0,
      deviationRate: 0,
    });
  }

  for (const profile of byId.values()) {
    const d = votingById.get(profile.mpId);
    if (d) {
      profile.votesConsidered = d.votesConsidered;
      profile.deviations = d.deviations;
      profile.deviationRate = d.deviationRate;
    }
  }

  return [...byId.values()].sort((a, b) => b.total - a.total);
}

/** An MP whose total spend sits well above the cohort average. */
export interface SpendOutlier {
  mpId: string;
  name: string;
  party: string;
  seatType: SeatType;
  total: number;
  /** Standard deviations above the cohort mean. */
  z: number;
  /** Multiple of the cohort average (e.g. 2.4 = 2.4x the typical MP). */
  vsAverage: number;
}

/** An MP whose spend in one quarter dwarfs their own typical quarter. */
export interface SpendSpike {
  mpId: string;
  name: string;
  party: string;
  period: string;
  amount: number;
  /** Multiple of the MP's own average active quarter. */
  ratio: number;
}

export interface SpendingInsights {
  cohortAverage: number;
  cohortStdDev: number;
  mpCount: number;
  outliers: SpendOutlier[];
  spikes: SpendSpike[];
}

/**
 * Surface expense patterns worth a second look: MPs spending far above their
 * peers (z-score on total spend) and single-quarter spikes against an MP's own
 * baseline. These are prompts for scrutiny, not accusations - high spend can be
 * entirely legitimate (a far-flung electorate, a ministerial travel schedule).
 */
export function detectSpendingInsights(rows: EnrichedExpense[]): SpendingInsights {
  const totals = new Map<
    string,
    { name: string; party: string; seatType: SeatType; total: number }
  >();
  const byMpPeriod = new Map<string, Map<string, number>>();

  for (const r of rows) {
    const entry = totals.get(r.mpId) ?? {
      name: r.name,
      party: r.party,
      seatType: r.seatType,
      total: 0,
    };
    entry.total += r.amount;
    totals.set(r.mpId, entry);

    const periodMap = byMpPeriod.get(r.mpId) ?? new Map<string, number>();
    periodMap.set(r.period, (periodMap.get(r.period) ?? 0) + r.amount);
    byMpPeriod.set(r.mpId, periodMap);
  }

  const values = [...totals.values()].map((t) => t.total);
  const mpCount = values.length;
  const mean = mpCount > 0 ? values.reduce((sum, v) => sum + v, 0) / mpCount : 0;
  const variance = mpCount > 0 ? values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / mpCount : 0;
  const stdDev = Math.sqrt(variance);

  const outliers: SpendOutlier[] = [...totals.entries()]
    .map(([mpId, t]) => ({
      mpId,
      name: t.name,
      party: t.party,
      seatType: t.seatType,
      total: t.total,
      z: stdDev > 0 ? (t.total - mean) / stdDev : 0,
      vsAverage: mean > 0 ? t.total / mean : 0,
    }))
    .filter((o) => o.z >= 1.5)
    .sort((a, b) => b.z - a.z)
    .slice(0, 12);

  const spikes: SpendSpike[] = [];
  for (const [mpId, periodMap] of byMpPeriod) {
    if (periodMap.size < 2) continue;
    const entry = totals.get(mpId);
    if (!entry) continue;
    const periodValues = [...periodMap.entries()];
    const avg = periodValues.reduce((sum, [, v]) => sum + v, 0) / periodValues.length;
    if (avg <= 0) continue;
    const [period, amount] = periodValues.reduce((best, cur) => (cur[1] > best[1] ? cur : best));
    const ratio = amount / avg;
    if (ratio >= 1.8 && amount >= 5000) {
      spikes.push({ mpId, name: entry.name, party: entry.party, period, amount, ratio });
    }
  }
  spikes.sort((a, b) => b.ratio - a.ratio);

  return {
    cohortAverage: mean,
    cohortStdDev: stdDev,
    mpCount,
    outliers,
    spikes: spikes.slice(0, 12),
  };
}
