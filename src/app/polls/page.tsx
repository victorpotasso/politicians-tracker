import type { Metadata } from 'next';

import { PollTrendChart } from '@/components/poll-charts';
import { PollsExplorer } from '@/components/polls-explorer';
import { Reveal } from '@/components/reveal';
import { ShaderBackground } from '@/components/shaders/shader-background';
import { StatCard } from '@/components/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getPollsExplorer } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Polls · NZ Politicians Tracker',
  description:
    'Published opinion polling across recent New Zealand general elections — filter by election cycle to compare party-vote trends, a poll of polls, and projected seat allocations linked to parties and their leaders.',
};

export default async function PollsPage() {
  const { elections, summaries, totalPolls, pollsters, fullTrend, fullTrendParties } =
    await getPollsExplorer();
  const current = summaries[0];

  return (
    <>
      <ShaderBackground />
      <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-6 py-14 sm:px-10">
        <Reveal>
          <header className="flex flex-col gap-3">
            <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
              New Zealand · {elections.length} election cycles
            </span>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Polls</h1>
            <p className="text-muted-foreground max-w-2xl text-balance">
              Published party-vote polling from {elections[elections.length - 1]} to {elections[0]}.
              Compare support over the long run, then filter by an election cycle for its poll of
              polls, seat projection, and every recorded poll.
            </p>
          </header>
        </Reveal>

        <Reveal delay={0.08}>
          <section className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Polls tracked" value={totalPolls} hint="Across all cycles" />
            <StatCard label="Election cycles" value={elections.length} hint="2008–2026" />
            <StatCard label="Pollsters" value={pollsters} hint="Distinct organisations" />
            <StatCard
              label="Current lead"
              value={current?.leadPct !== null ? `${current?.leadPct}%` : '—'}
              hint={current?.leadParty ?? undefined}
            />
          </section>
        </Reveal>

        <Reveal delay={0.14}>
          <section className="mt-4">
            <Card className="bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Support across every cycle</CardTitle>
                <CardDescription>
                  Party-vote share in every published poll, {elections[elections.length - 1]}–
                  {elections[0]} — the long-run comparison
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PollTrendChart data={fullTrend} parties={fullTrendParties} />
              </CardContent>
            </Card>
          </section>
        </Reveal>

        <Reveal delay={0.2}>
          <section className="mt-8">
            <h2 className="mb-4 text-xl font-semibold tracking-tight">Filter by election</h2>
            <PollsExplorer summaries={summaries} />
          </section>
        </Reveal>

        <footer className="text-muted-foreground mt-16 flex flex-wrap items-center justify-between gap-2 border-t pt-6 text-xs">
          <span>
            Poll data from Wikipedia’s aggregation of published NZ opinion polls (CC BY-SA 4.0), the
            same upstream used by the <code>nzelect</code> package and Andrew Chen’s polls archive.
            Seat projections use the Sainte-Laguë method with the 5% threshold and are approximate.
          </span>
          <span>{totalPolls} polls</span>
        </footer>
      </main>
    </>
  );
}
