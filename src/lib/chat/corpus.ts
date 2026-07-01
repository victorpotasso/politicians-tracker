import type { Bill, Expense, MP, MpEnrichment, Poll, Vote } from '@/types/records';
import type { ChatDoc } from './types';

/**
 * Everything `buildChatCorpus` needs. Loaded server-side (the loaders in
 * `lib/data.ts` are `server-only`) and handed to this pure function so the
 * corpus computation stays out of the client bundle while the LLM work stays
 * client-only.
 */
export interface PartyCorpusInput {
  party: string;
  slug: string;
  mpCount: number;
  currentSeats: number | null;
  peakSeats: number;
  peakYear: number | null;
  inGovernmentNow: boolean;
}

export interface CorpusInput {
  mps: MP[];
  enrichment: MpEnrichment[];
  bills: Bill[];
  votes: Vote[];
  expenses: Expense[];
  polls: Poll[];
  parties: PartyCorpusInput[];
}

const NZD = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  maximumFractionDigits: 0,
});

function truncate(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

function personDoc(
  mp: MP,
  enrichment: MpEnrichment | undefined,
  votes: { ayes: number; noes: number; bills: number },
  spend: number,
): ChatDoc {
  const partyLine = [mp.party, mp.electorate].filter(Boolean).join(' · ');
  const desc = enrichment?.description ?? mp.role ?? 'Member of the New Zealand Parliament';
  const bio = enrichment?.extract ?? '';
  const lead = truncate(bio || `${desc}. ${partyLine}`);

  const relations = [
    `Full name: ${mp.name}.`,
    mp.party ? `Party: ${mp.party}.` : null,
    mp.electorate ? `Electorate: ${mp.electorate}.` : null,
    mp.role ? `Role: ${mp.role}.` : null,
    votes.bills > 0
      ? `Voting record: ${votes.ayes} ayes and ${votes.noes} noes across ${votes.bills} bills.`
      : null,
    spend > 0 ? `Total recorded expenses: ${NZD.format(spend)}.` : null,
  ]
    .filter(Boolean)
    .join(' ');

  const text = [
    mp.name,
    mp.party ?? '',
    mp.electorate ?? '',
    mp.role ?? '',
    desc,
    bio,
    votes.bills > 0
      ? `Voted on ${votes.bills} bills, ${votes.ayes} in favour, ${votes.noes} against.`
      : '',
    spend > 0 ? `Recorded parliamentary expenses of ${NZD.format(spend)}.` : '',
  ]
    .filter(Boolean)
    .join('. ');

  return {
    id: `person:${mp.mpId}`,
    group: 'person',
    title: mp.name,
    subtitle: partyLine || desc,
    lead,
    image: `/politicians/${mp.mpId}.jpg`,
    href: `/politicians/${mp.mpId}`,
    text,
    relations,
  };
}

function partyDoc(party: PartyCorpusInput, pollPct: number | null): ChatDoc {
  const seatsLine =
    party.currentSeats != null
      ? `${party.currentSeats} seats in the current Parliament`
      : 'not currently seated';
  const govLine = party.inGovernmentNow ? 'in government' : 'in opposition';
  const pollLine = pollPct != null ? `Latest polling around ${pollPct.toFixed(1)}%.` : '';

  const lead = truncate(
    `${party.party} — ${seatsLine}, ${govLine}. Tracking ${party.mpCount} MPs. ${pollLine}`,
  );

  const relations = [
    `Party: ${party.party}.`,
    party.currentSeats != null ? `Current seats: ${party.currentSeats}.` : null,
    `Currently ${party.inGovernmentNow ? 'in government' : 'in opposition'}.`,
    party.peakYear ? `Peak of ${party.peakSeats} seats in ${party.peakYear}.` : null,
    pollPct != null ? `Latest poll support ${pollPct.toFixed(1)}%.` : null,
    `MPs tracked: ${party.mpCount}.`,
  ]
    .filter(Boolean)
    .join(' ');

  const text = [
    party.party,
    'political party New Zealand Parliament',
    seatsLine,
    govLine,
    `${party.mpCount} members of parliament`,
    party.peakYear ? `peak ${party.peakSeats} seats in ${party.peakYear}` : '',
    pollLine,
  ]
    .filter(Boolean)
    .join('. ');

  return {
    id: `party:${party.slug}`,
    group: 'party',
    title: party.party,
    subtitle: `${seatsLine} · ${govLine}`,
    lead,
    href: `/parties/${party.slug}`,
    text,
    relations,
  };
}

function billDoc(bill: Bill, divisions: number): ChatDoc {
  const year = bill.introducedDate ? bill.introducedDate.slice(0, 4) : null;
  const subtitle = [year ? `Introduced ${year}` : null, bill.stage].filter(Boolean).join(' · ');
  const abstract = bill.abstract ?? '';
  const lead = truncate(
    abstract || `A bill before the New Zealand Parliament.${year ? ` Introduced in ${year}.` : ''}`,
  );

  const relations = [
    `Bill: ${bill.title}.`,
    year ? `Introduced: ${year}.` : null,
    bill.stage ? `Stage: ${bill.stage}.` : null,
    divisions > 0 ? `Attracted ${divisions} recorded divisions (votes).` : null,
    bill.proponentName ? `Proponent: ${bill.proponentName}.` : null,
  ]
    .filter(Boolean)
    .join(' ');

  const text = [
    bill.title,
    'bill legislation New Zealand Parliament',
    abstract,
    year ? `introduced ${year}` : '',
    bill.stage ?? '',
    bill.proponentName ?? '',
    divisions > 0 ? `${divisions} divisions recorded` : '',
  ]
    .filter(Boolean)
    .join('. ');

  return {
    id: `bill:${bill.billId}`,
    group: 'bill',
    title: bill.title,
    subtitle: subtitle || 'Bill',
    lead,
    href: `/bills/${bill.billId}`,
    text,
    relations,
  };
}

function pollDoc(poll: Poll): ChatDoc {
  const top = [...poll.results]
    .filter((r) => r.percentage != null)
    .sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0))
    .slice(0, 4);
  const standing = top.map((r) => `${r.party} ${r.percentage?.toFixed(1)}%`).join(', ');
  const date = poll.endDate ?? poll.startDate ?? '';
  const subtitle = [poll.pollster, date].filter(Boolean).join(' · ');
  const lead = truncate(`${poll.pollster} poll${date ? ` (${date})` : ''}: ${standing}.`);

  const relations = [
    `Pollster: ${poll.pollster}.`,
    date ? `Fieldwork ended: ${date}.` : null,
    poll.sampleSize ? `Sample size: ${poll.sampleSize}.` : null,
    standing ? `Party standings: ${standing}.` : null,
  ]
    .filter(Boolean)
    .join(' ');

  const text = [
    `${poll.pollster} opinion poll`,
    'polling election party vote support percentage',
    date ? `conducted ${date}` : '',
    poll.election ? `for the ${poll.election} election` : '',
    standing,
  ]
    .filter(Boolean)
    .join('. ');

  return {
    id: `poll:${poll.pollId}`,
    group: 'poll',
    title: `${poll.pollster} poll${date ? ` — ${date}` : ''}`,
    subtitle: subtitle || 'Opinion poll',
    lead,
    href: '/polls',
    text,
    relations,
  };
}

/**
 * Flatten every domain entity into a `ChatDoc`. Pure; call server-side with the
 * data already loaded from `lib/data.ts`.
 */
export function buildChatCorpus(input: CorpusInput): ChatDoc[] {
  const { mps, enrichment, bills, votes, expenses, polls, parties } = input;

  const enrichmentById = new Map(enrichment.map((e) => [e.mpId, e]));

  // Per-MP vote tallies.
  const voteStats = new Map<string, { ayes: number; noes: number; bills: Set<string> }>();
  for (const v of votes) {
    if (!v.mpId) continue;
    const stat = voteStats.get(v.mpId) ?? { ayes: 0, noes: 0, bills: new Set<string>() };
    if (v.vote === 'aye') stat.ayes += 1;
    else if (v.vote === 'nay') stat.noes += 1;
    if (v.billId) stat.bills.add(v.billId);
    voteStats.set(v.mpId, stat);
  }

  // Per-MP total spend.
  const spendById = new Map<string, number>();
  for (const e of expenses) {
    if (!e.mpId) continue;
    spendById.set(e.mpId, (spendById.get(e.mpId) ?? 0) + (e.amount ?? 0));
  }

  // Divisions per bill.
  const divisionsByBill = new Map<string, Set<string>>();
  for (const v of votes) {
    if (!v.billId) continue;
    const set = divisionsByBill.get(v.billId) ?? new Set<string>();
    set.add(v.voteId);
    divisionsByBill.set(v.billId, set);
  }

  // Latest poll percentage per party (by canonical name match on results).
  const latestPoll = [...polls].sort((a, b) => (b.endDate ?? '').localeCompare(a.endDate ?? ''))[0];
  const partyPollPct = new Map<string, number>();
  if (latestPoll) {
    for (const r of latestPoll.results) {
      if (r.percentage != null) partyPollPct.set(r.party, r.percentage);
    }
  }

  const docs: ChatDoc[] = [];

  for (const mp of mps) {
    const stat = voteStats.get(mp.mpId);
    docs.push(
      personDoc(
        mp,
        enrichmentById.get(mp.mpId),
        {
          ayes: stat?.ayes ?? 0,
          noes: stat?.noes ?? 0,
          bills: stat?.bills.size ?? 0,
        },
        spendById.get(mp.mpId) ?? 0,
      ),
    );
  }

  for (const party of parties) {
    docs.push(partyDoc(party, partyPollPct.get(party.party) ?? null));
  }

  for (const bill of bills) {
    docs.push(billDoc(bill, divisionsByBill.get(bill.billId)?.size ?? 0));
  }

  // The most recent polls only — the full 800+ would swamp retrieval.
  const recentPolls = [...polls]
    .sort((a, b) => (b.endDate ?? '').localeCompare(a.endDate ?? ''))
    .slice(0, 8);
  for (const poll of recentPolls) {
    docs.push(pollDoc(poll));
  }

  return docs;
}
