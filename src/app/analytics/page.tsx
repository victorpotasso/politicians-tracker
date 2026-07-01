import { BarChart3, Landmark, Users, Wallet } from 'lucide-react';
import type { Metadata } from 'next';

import { AnalyticsExplorer } from '@/components/analytics-explorer';
import { Reveal } from '@/components/reveal';
import { ShaderBackground } from '@/components/shaders/shader-background';
import { StatCard } from '@/components/stat-card';
import { computeVotingDiscipline, enrichExpenses } from '@/lib/analytics';
import { getExpenses, getMps, getSpending, getVotes } from '@/lib/data';
import { formatNZDCompact } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Analytics',
  description:
    'Cross-cutting analysis of New Zealand politics: MP and party expenses, electorate vs list travel, party-line voting discipline, and macro Crown spending. Filter by party, seat type and MP to surface the patterns that matter.',
};

export default async function AnalyticsPage() {
  const [mps, expenses, votes, spending] = await Promise.all([
    getMps(),
    getExpenses(),
    getVotes(),
    getSpending(),
  ]);

  const rows = enrichExpenses(expenses.records, mps.records);
  const voting = computeVotingDiscipline(votes.records, mps.records);
  const periods = [...new Set(rows.map((r) => r.period))].sort((a, b) => a.localeCompare(b));

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
              Four ways to read the numbers — expenses, electorate travel, voting discipline and
              Crown spending. Set the filters once and every analysis reshapes around your question.
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
              label="Voting divisions"
              value={voting.coverage.divisions}
              hint={`${voting.coverage.mps} MPs covered`}
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
