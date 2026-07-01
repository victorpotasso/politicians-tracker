import {
  ArrowRight,
  BarChart3,
  FileText,
  Flag,
  Landmark,
  LineChart,
  Scale,
  Sparkles,
  Users,
  Vote,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { CompositionChart, ElectorateListDonut } from '@/components/composition-chart';
import { MpCard } from '@/components/mp-card';
import { PartyChart } from '@/components/party-chart';
import { PollTrendChart } from '@/components/poll-charts';
import { RankingList } from '@/components/ranking-list';
import { Reveal } from '@/components/reveal';
import { ShaderBackground } from '@/components/shaders/shader-background';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  countByParty,
  electorateListSplit,
  getBills,
  getExpenses,
  getMps,
  getPolls,
  getVotes,
  latestPoll,
  pollAverage,
  pollTrend,
  seatCompositionSeries,
} from '@/lib/data';
import { partyColor } from '@/lib/party';
import { formatNZDCompact } from '@/lib/utils';

export default async function Home() {
  const [mpsData, billsData, votesData, expensesData, pollsData] = await Promise.all([
    getMps(),
    getBills(),
    getVotes(),
    getExpenses(),
    getPolls(),
  ]);
  const mps = mpsData.records;
  const bills = billsData.records;
  const votes = votesData.records;
  const expenses = expensesData.records;
  const polls = pollsData.records;
  const parties = countByParty(mps);

  const distinctDivisions = new Set(votes.map((v) => v.voteId)).size;
  const totalSpend = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);

  const composition = seatCompositionSeries();
  const seatSplit = electorateListSplit(mps);
  const trendParties = ['National', 'Labour', 'Green', 'ACT', 'New Zealand First', 'Te Pāti Māori'];
  const trend = pollTrend(polls, trendParties);
  const pollAvg = pollAverage(polls, 6);
  const latest = latestPoll(polls);

  const topParties = parties.slice(0, 6).map((p) => ({ label: p.party, value: p.count }));

  const ministers = [...mps].filter((mp) => mp.role && /minister|speaker|rt hon/i.test(mp.role));
  const featuredMps = (ministers.length >= 6 ? ministers : mps).slice(0, 6);

  const lastUpdated = [mpsData, billsData, votesData, expensesData]
    .map((d) => d.meta.collectedAt)
    .filter(Boolean)
    .sort()
    .pop();

  return (
    <>
      <ShaderBackground />
      <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-6 py-14 sm:px-10">
        <Reveal>
          <header className="flex flex-col gap-3">
            <span className="text-muted-foreground inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase">
              <Sparkles className="size-3.5" aria-hidden />
              New Zealand · Public political data
            </span>
            <h1 className="text-fluid-hero font-display text-brand-gradient font-bold text-balance">
              Political data dashboard
            </h1>
            <p className="text-muted-foreground max-w-2xl text-balance">
              A database of MPs, bills, and voting records for data analysis.
            </p>
            <div className="mt-1 flex gap-2">
              <Button asChild>
                <Link href="/politicians">
                  Browse politicians
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            </div>
          </header>
        </Reveal>

        <Reveal delay={0.08}>
          <section className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Current MPs"
              value={mps.length}
              hint="122nd Parliament"
              icon={Users}
              accent="var(--chart-2)"
            />
            <StatCard
              label="Bills tracked"
              value={bills.length}
              hint="With recorded votes"
              icon={FileText}
              accent="var(--chart-1)"
            />
            <StatCard
              label="Divisions"
              value={distinctDivisions}
              hint="Personal-vote records"
              icon={Vote}
              accent="var(--chart-4)"
            />
            <StatCard
              label="Tracked spend"
              value={formatNZDCompact(totalSpend)}
              hint="Travel & accommodation"
              icon={Wallet}
              accent="var(--chart-5)"
            />
          </section>
        </Reveal>

        {trend.length > 0 && latest ? (
          <Reveal delay={0.12}>
            <section className="mt-8">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <h2 className="font-display flex items-center gap-2 text-2xl font-semibold tracking-tight">
                    <LineChart className="text-brand size-5" aria-hidden />
                    Race to 2026
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Poll of polls across {polls.length} published surveys
                  </p>
                </div>
                <Link href="/polls" className="text-primary text-sm underline underline-offset-4">
                  <span className="inline-flex items-center gap-1.5">
                    Full polling
                    <ArrowRight className="size-3.5" aria-hidden />
                  </span>
                </Link>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="bg-card/60 backdrop-blur-sm lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <LineChart className="text-muted-foreground size-4" aria-hidden />
                      Party-vote trend
                    </CardTitle>
                    <CardDescription>Support over time, by party</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PollTrendChart data={trend} parties={trendParties} />
                  </CardContent>
                </Card>
                <Card className="bg-card/60 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="text-muted-foreground size-4" aria-hidden />
                      Poll of polls
                    </CardTitle>
                    <CardDescription>Mean of the 6 most recent polls</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RankingList
                      items={pollAvg.map((p) => ({
                        label: p.party,
                        value: p.percentage,
                        accent: partyColor(p.party),
                      }))}
                      formatValue={(v) => `${v}%`}
                    />
                  </CardContent>
                </Card>
              </div>
            </section>
          </Reveal>
        ) : null}

        <Reveal delay={0.16}>
          <section className="mt-8 grid gap-4 lg:grid-cols-3">
            <Card className="bg-card/60 backdrop-blur-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="text-muted-foreground size-4" aria-hidden />
                  MPs by party
                </CardTitle>
                <CardDescription>Current Parliament composition</CardDescription>
              </CardHeader>
              <CardContent>
                <PartyChart data={parties} />
              </CardContent>
            </Card>

            <Card className="bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flag className="text-muted-foreground size-4" aria-hidden />
                  Top parties
                </CardTitle>
                <CardDescription>Ranked by number of MPs</CardDescription>
              </CardHeader>
              <CardContent>
                <RankingList items={topParties} />
              </CardContent>
            </Card>
          </section>
        </Reveal>

        <Reveal delay={0.2}>
          <section className="mt-8">
            <Card className="bg-card/60 backdrop-blur-sm">
              <CardContent className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex flex-col gap-1">
                  <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                    <BarChart3 className="text-brand size-5" aria-hidden />
                    Cross the data in Analytics
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Money, politicians, parties, bills and Crown spending &mdash; filterable, with
                    an under-scrutiny layer that flags unusual expenses.
                  </p>
                </div>
                <Button asChild>
                  <Link href="/analytics">
                    Open Analytics
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </section>
        </Reveal>

        <Reveal delay={0.24}>
          <section className="mt-8">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="font-display flex items-center gap-2 text-2xl font-semibold tracking-tight">
                  <Scale className="text-brand size-5" aria-hidden />
                  Balance of power
                </h2>
                <p className="text-muted-foreground text-sm">
                  How Parliament's make-up has shifted across the MMP era
                </p>
              </div>
              <Link
                href="/parliament"
                className="text-primary text-sm underline underline-offset-4"
              >
                <span className="inline-flex items-center gap-1.5">
                  Explore Parliament
                  <ArrowRight className="size-3.5" aria-hidden />
                </span>
              </Link>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="bg-card/60 backdrop-blur-sm lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Landmark className="text-muted-foreground size-4" aria-hidden />
                    Seats over time
                  </CardTitle>
                  <CardDescription>Party seats won at each election, 1996–2023</CardDescription>
                </CardHeader>
                <CardContent>
                  <CompositionChart data={composition.data} parties={composition.parties} />
                </CardContent>
              </Card>
              <Card className="bg-card/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="text-muted-foreground size-4" aria-hidden />
                    Electorate vs list
                  </CardTitle>
                  <CardDescription>Current {mps.length}-seat House</CardDescription>
                </CardHeader>
                <CardContent>
                  <ElectorateListDonut data={seatSplit} />
                </CardContent>
              </Card>
            </div>
          </section>
        </Reveal>

        <Reveal delay={0.28}>
          <section className="mt-10">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="font-display flex items-center gap-2 text-xl font-semibold tracking-tight">
                  <Users className="text-brand size-5" aria-hidden />
                  Politicians
                </h2>
                <p className="text-muted-foreground text-sm">A sample of the {mps.length} MPs</p>
              </div>
              <Link
                href="/politicians"
                className="text-primary text-sm underline underline-offset-4"
              >
                <span className="inline-flex items-center gap-1.5">
                  View all
                  <ArrowRight className="size-3.5" aria-hidden />
                </span>
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {featuredMps.map((mp) => (
                <MpCard key={mp.mpId} mp={mp} />
              ))}
            </div>
          </section>
        </Reveal>

        <footer className="text-muted-foreground mt-16 flex flex-wrap items-center justify-between gap-2 border-t pt-6 text-xs">
          <span>Sources: data.govt.nz (Parliamentary Service) &amp; voted.nz (CC-BY 4.0).</span>
          {lastUpdated ? (
            <span>Updated {new Date(lastUpdated).toLocaleString('en-NZ')}</span>
          ) : (
            <span>Run pnpm data:collect to populate data.</span>
          )}
        </footer>
      </main>
    </>
  );
}
