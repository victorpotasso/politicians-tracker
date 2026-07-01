import { BarChart3, Landmark, Users, Wallet } from 'lucide-react';
import type { Metadata } from 'next';
import type { PartyPollingRow } from '@/components/analytics/parties-analysis';
import { AnalyticsExplorer } from '@/components/analytics-explorer';
import { Reveal } from '@/components/reveal';
import { ShaderBackground } from '@/components/shaders/shader-background';
import { StatCard } from '@/components/stat-card';
import {
  computeVotingDiscipline,
  detectSpendingInsights,
  enrichExpenses,
  mpCrossProfiles,
} from '@/lib/analytics';
import {
  getBills,
  getExpenses,
  getMps,
  getPartySummaries,
  getPolls,
  getSpending,
  getVotes,
  pollAverage,
  projectSeats,
  rankBillsByDivisions,
} from '@/lib/data';
import { canonicalParty } from '@/lib/party';
import { formatNZDCompact } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Analytics',
  description:
    'Cross-cutting analysis of New Zealand politics by category: money, politicians, parties, bills and Crown spending, plus an "under scrutiny" layer that flags unusual expense patterns. Filter by party, seat type and MP to surface what the data hides.',
};

export default async function AnalyticsPage() {
  const [mps, bills, expenses, votes, polls, spending, summaries] = await Promise.all([
    getMps(),
    getBills(),
    getExpenses(),
    getVotes(),
    getPolls(),
    getSpending(),
    getPartySummaries(),
  ]);

  const rows = enrichExpenses(expenses.records, mps.records);
  const voting = computeVotingDiscipline(votes.records, mps.records);
  const profiles = mpCrossProfiles(rows, voting);
  const periods = [...new Set(rows.map((r) => r.period))].sort((a, b) => a.localeCompare(b));
  const billRanks = rankBillsByDivisions(bills.records, votes.records);
  const insights = detectSpendingInsights(rows);

  // Party polling context: current seats vs seats projected from the poll-of-polls.
  const averages = pollAverage(polls.records);
  const projection = projectSeats(averages);
  const pollByParty = new Map(averages.map((a) => [canonicalParty(a.party), a.percentage]));
  const projByParty = new Map(projection.map((p) => [canonicalParty(p.party), p.seats]));
  const mpCountByParty = new Map<string, number>();
  for (const mp of mps.records) {
    if (!mp.party) continue;
    const p = canonicalParty(mp.party);
    mpCountByParty.set(p, (mpCountByParty.get(p) ?? 0) + 1);
  }
  const polling: PartyPollingRow[] = summaries
    .filter((s) => s.currentSeats !== null || pollByParty.has(s.party))
    .map((s) => ({
      party: s.party,
      mpCount: mpCountByParty.get(s.party) ?? 0,
      currentSeats: s.currentSeats ?? 0,
      pollPct: pollByParty.get(s.party) ?? null,
      projectedSeats: projByParty.get(s.party) ?? null,
    }));

  const totalSpend = rows.reduce((sum, r) => sum + r.amount, 0);
  const trackedMps = new Set(rows.map((r) => r.mpId)).size;

  return (
    <>
      <ShaderBackground />
      <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-6 py-14 sm:px-10">
        <Reveal>
          <header className="flex flex-col gap-3">
            <span className="text-muted-foreground inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase">
              <BarChart3 className="size-3.5" aria-hidden />
              New Zealand · Cross-cutting analysis
            </span>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Analytics</h1>
            <p className="text-muted-foreground max-w-2xl text-balance">
              Cross the data by category — money, politicians, parties, bills and Crown spending —
              then dig into what&rsquo;s unusual under scrutiny. Set the filters once and every
              analysis reshapes around your question.
            </p>
          </header>
        </Reveal>

        <Reveal delay={0.08}>
          <section className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Expense spend tracked"
              value={formatNZDCompact(totalSpend)}
              hint={`${periods.length} quarters`}
              icon={Wallet}
              accent="var(--chart-1)"
            />
            <StatCard
              label="MPs with expenses"
              value={trackedMps}
              hint="Matched to a member"
              icon={Users}
              accent="var(--chart-2)"
            />
            <StatCard
              label="Under scrutiny"
              value={insights.outliers.length}
              hint="Spending outliers flagged"
              icon={BarChart3}
              accent="var(--chart-4)"
            />
            <StatCard
              label="Fiscal years"
              value={spending.records.length}
              hint="Crown spending series"
              icon={Landmark}
              accent="var(--chart-3)"
            />
          </section>
        </Reveal>

        <Reveal delay={0.16}>
          <section className="mt-8">
            <AnalyticsExplorer
              rows={rows}
              periods={periods}
              voting={voting}
              profiles={profiles}
              polling={polling}
              billRanks={billRanks}
              spendingRecords={spending.records}
            />
          </section>
        </Reveal>

        <footer className="text-muted-foreground mt-16 flex flex-wrap items-center justify-between gap-2 border-t pt-6 text-xs">
          <span>
            Sources: MP expenses via data.govt.nz (CC BY 4.0); voting records via voted.nz (CC BY
            4.0); Crown spending via The Treasury Fiscal Time Series (CC BY 4.0). Voting coverage is
            partial and party positions are inferred from voting majorities. Figures are indicative
            and best read with context.
          </span>
        </footer>
      </main>
    </>
  );
}
