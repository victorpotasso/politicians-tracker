import Link from 'next/link';
import { SpendByCategoryDonut, SpendTrendChart } from '@/components/money-charts';
import { MpCard } from '@/components/mp-card';
import { PartyChart } from '@/components/party-chart';
import { RankingList } from '@/components/ranking-list';
import { Reveal } from '@/components/reveal';
import { ShaderBackground } from '@/components/shaders/shader-background';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  countByParty,
  getBills,
  getExpenses,
  getMps,
  getVotes,
  rankBillsByDivisions,
  rankTopSpenders,
  spendByCategory,
  spendByParty,
  spendByPeriod,
} from '@/lib/data';
import { partyColor } from '@/lib/party';
import { formatNZD, formatNZDCompact } from '@/lib/utils';

export default async function Home() {
  const [mpsData, billsData, votesData, expensesData] = await Promise.all([
    getMps(),
    getBills(),
    getVotes(),
    getExpenses(),
  ]);
  const mps = mpsData.records;
  const bills = billsData.records;
  const votes = votesData.records;
  const expenses = expensesData.records;
  const parties = countByParty(mps);
  const billRanks = rankBillsByDivisions(bills, votes);

  const distinctDivisions = new Set(votes.map((v) => v.voteId)).size;
  const totalSpend = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);

  const topParties = parties.slice(0, 6).map((p) => ({ label: p.party, value: p.count }));
  const topBills = billRanks.slice(0, 6).map((b) => ({
    label: b.title,
    value: b.divisions,
    accent: 'var(--chart-1)',
    href: `/bills/${b.billId}`,
  }));

  const topSpenders = rankTopSpenders(expenses, mps, 8).map((s) => ({
    label: s.name,
    value: s.total,
    href: `/politicians/${s.mpId}`,
    sublabel: s.party ?? undefined,
    accent: partyColor(s.party),
  }));
  const partySpend = spendByParty(expenses, mps).map((p) => ({
    label: p.category,
    value: p.amount,
    accent: partyColor(p.category),
  }));
  const categorySpend = spendByCategory(expenses).map((c) => ({
    category: c.category[0].toUpperCase() + c.category.slice(1),
    amount: c.amount,
  }));
  const periodSpend = spendByPeriod(expenses);

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
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-14 sm:px-10">
        <Reveal>
          <header className="flex flex-col gap-3">
            <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
              New Zealand · Public political data
            </span>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Political data dashboard
            </h1>
            <p className="text-muted-foreground max-w-2xl text-balance">
              A local, JSON-backed database of MPs, bills, and voting records for data analysis.
              Refresh anytime with <code className="text-foreground">pnpm data:collect</code>.
            </p>
            <div className="mt-1 flex gap-2">
              <Button asChild>
                <Link href="/politicians">Browse politicians →</Link>
              </Button>
            </div>
          </header>
        </Reveal>

        <Reveal delay={0.08}>
          <section className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Current MPs" value={mps.length} hint="122nd Parliament" />
            <StatCard label="Bills tracked" value={bills.length} hint="With recorded votes" />
            <StatCard label="Divisions" value={distinctDivisions} hint="Personal-vote records" />
            <StatCard
              label="Tracked spend"
              value={formatNZDCompact(totalSpend)}
              hint="Travel & accommodation"
            />
          </section>
        </Reveal>

        <Reveal delay={0.16}>
          <section className="mt-8 grid gap-4 lg:grid-cols-3">
            <Card className="bg-card/60 backdrop-blur-sm lg:col-span-2">
              <CardHeader>
                <CardTitle>MPs by party</CardTitle>
                <CardDescription>Current Parliament composition</CardDescription>
              </CardHeader>
              <CardContent>
                <PartyChart data={parties} />
              </CardContent>
            </Card>

            <Card className="bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Top parties</CardTitle>
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
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Follow the money</h2>
                <p className="text-muted-foreground text-sm">
                  MP travel &amp; accommodation, {periodSpend.length} quarters of disclosures
                </p>
              </div>
              <span className="text-muted-foreground text-sm tabular-nums">
                {formatNZD(totalSpend)} total
              </span>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="bg-card/60 backdrop-blur-sm lg:col-span-2">
                <CardHeader>
                  <CardTitle>Spend over time</CardTitle>
                  <CardDescription>Total disclosed expenses per quarter</CardDescription>
                </CardHeader>
                <CardContent>
                  <SpendTrendChart data={periodSpend} />
                </CardContent>
              </Card>
              <Card className="bg-card/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>By category</CardTitle>
                  <CardDescription>Travel vs accommodation</CardDescription>
                </CardHeader>
                <CardContent>
                  <SpendByCategoryDonut data={categorySpend} />
                </CardContent>
              </Card>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Card className="bg-card/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Top spenders</CardTitle>
                  <CardDescription>Highest disclosed spend (matched MPs)</CardDescription>
                </CardHeader>
                <CardContent>
                  <RankingList items={topSpenders} formatValue={formatNZDCompact} />
                </CardContent>
              </Card>
              <Card className="bg-card/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Spend by party</CardTitle>
                  <CardDescription>Total disclosed spend per party</CardDescription>
                </CardHeader>
                <CardContent>
                  <RankingList items={partySpend} formatValue={formatNZDCompact} />
                </CardContent>
              </Card>
            </div>
          </section>
        </Reveal>

        <Reveal delay={0.24}>
          <section className="mt-8">
            <Card className="bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Most contested bills</CardTitle>
                <CardDescription>Ranked by number of recorded divisions</CardDescription>
              </CardHeader>
              <CardContent>
                <RankingList items={topBills} />
              </CardContent>
            </Card>
          </section>
        </Reveal>

        <Reveal delay={0.28}>
          <section className="mt-10">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Politicians</h2>
                <p className="text-muted-foreground text-sm">A sample of the {mps.length} MPs</p>
              </div>
              <Link
                href="/politicians"
                className="text-primary text-sm underline underline-offset-4"
              >
                View all →
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
