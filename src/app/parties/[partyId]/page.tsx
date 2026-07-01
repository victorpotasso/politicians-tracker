import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { MpCard } from '@/components/mp-card';
import { PartySeatHistory } from '@/components/party-seat-history';
import { PartyPollTrend } from '@/components/poll-charts';
import { Reveal } from '@/components/reveal';
import { StatCard } from '@/components/stat-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getPartyDetail, getPartyPolling, getPartySummaries } from '@/lib/data';

interface Params {
  params: Promise<{ partyId: string }>;
}

export async function generateStaticParams() {
  const parties = await getPartySummaries();
  return parties.map((p) => ({ partyId: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { partyId } = await params;
  const detail = await getPartyDetail(partyId);
  if (!detail) return { title: 'Party not found' };
  return {
    title: detail.summary.party,
    description: `Seats, governments, and members of the ${detail.summary.party} in the New Zealand Parliament.`,
  };
}

function formatYears(years: number[]): string {
  return years.join(', ');
}

export default async function PartyDetailPage({ params }: Params) {
  const { partyId } = await params;
  const detail = await getPartyDetail(partyId);
  if (!detail) notFound();

  const { summary, mps, seatHistory, governmentTerms, primeMinisters } = detail;
  const seatedYears = seatHistory.filter((p) => p.seats > 0);
  const polling = await getPartyPolling(summary.party);

  return (
    <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:px-10">
      <Reveal>
        <Link href="/parties" className="text-muted-foreground hover:text-foreground text-sm">
          ← All parties
        </Link>
      </Reveal>

      <Reveal delay={0.06} className="mt-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="size-6 rounded-md ring-2 ring-white/10"
              style={{ backgroundColor: summary.color }}
              aria-hidden
            />
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
              {summary.party}
            </h1>
            {summary.inGovernmentNow ? (
              <Badge
                style={{ backgroundColor: summary.color, color: '#fff' }}
                className="border-transparent"
              >
                In government
              </Badge>
            ) : summary.currentSeats ? (
              <Badge variant="outline">Opposition</Badge>
            ) : (
              <Badge variant="secondary">Not currently seated</Badge>
            )}
          </div>
          <p className="text-muted-foreground max-w-2xl text-sm">
            {seatedYears.length > 0
              ? `Held seats in ${seatedYears.length} of ${seatHistory.length} MMP-era Parliaments, from ${seatedYears[0].year} to ${seatedYears[seatedYears.length - 1].year}.`
              : 'No recorded seats in the tracked MMP-era Parliaments.'}
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.12}>
        <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Seats now" value={summary.currentSeats ?? '—'} hint="Current House" />
          <StatCard
            label="Peak seats"
            value={summary.peakSeats || '—'}
            hint={summary.peakYear ? `${summary.peakYear} election` : undefined}
          />
          <StatCard label="Terms in govt" value={summary.termsInGovernment} hint="MMP era" />
          <StatCard label="MPs tracked" value={summary.mpCount} hint="In dataset" />
        </section>
      </Reveal>

      <Reveal delay={0.16}>
        <section className="mt-4 grid gap-4 lg:grid-cols-3">
          <Card className="bg-card/60 backdrop-blur-sm lg:col-span-2">
            <CardHeader>
              <CardTitle>Seats over time</CardTitle>
              <CardDescription>Seats won at each general election, 1996–2023</CardDescription>
            </CardHeader>
            <CardContent>
              <PartySeatHistory data={seatHistory} color={summary.color} />
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>In government</CardTitle>
              <CardDescription>
                {governmentTerms.length > 0
                  ? `${governmentTerms.length} term${governmentTerms.length === 1 ? '' : 's'}`
                  : 'No governing terms recorded'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {primeMinisters.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="text-muted-foreground text-xs tracking-widest uppercase">
                    Prime Ministers
                  </p>
                  {primeMinisters.map((pm) => (
                    <div key={pm.name} className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium">{pm.name}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {formatYears(pm.years)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
              {governmentTerms.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {governmentTerms.map((t) => (
                    <Badge key={t.year} variant="secondary">
                      {t.year}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  This party has sat in opposition throughout the tracked period.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      </Reveal>

      {polling ? (
        <Reveal delay={0.18}>
          <section className="mt-4 grid gap-4 lg:grid-cols-3">
            <Card className="bg-card/60 backdrop-blur-sm lg:col-span-2">
              <CardHeader>
                <CardTitle>In the polls</CardTitle>
                <CardDescription>
                  {summary.party}&apos;s party-vote support across published polls for the next
                  election
                </CardDescription>
              </CardHeader>
              <CardContent>
                {polling.trend.length > 0 ? (
                  <PartyPollTrend data={polling.trend} color={polling.color} />
                ) : (
                  <p className="text-muted-foreground py-12 text-center text-sm">
                    No polling recorded for this party.
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
              <StatCard
                label="Poll average"
                value={polling.average !== null ? `${polling.average}%` : '—'}
                hint="Recent poll of polls"
              />
              <StatCard
                label="Projected seats"
                value={polling.projectedSeats || '—'}
                hint={`vs ${polling.currentSeats || 0} now`}
              />
            </div>
          </section>
        </Reveal>
      ) : null}

      <Reveal delay={0.2}>
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Members</h2>
              <p className="text-muted-foreground text-sm">
                {mps.length} tracked {mps.length === 1 ? 'MP' : 'MPs'} affiliated with{' '}
                {summary.party}
              </p>
            </div>
            <Link href="/politicians" className="text-primary text-sm underline underline-offset-4">
              All politicians →
            </Link>
          </div>
          {mps.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {mps.map((mp) => (
                <MpCard key={mp.mpId} mp={mp} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground rounded-lg border border-dashed py-12 text-center text-sm">
              No individual MPs for this party in the tracked dataset.
            </p>
          )}
        </section>
      </Reveal>

      <footer className="text-muted-foreground mt-16 border-t pt-6 text-xs">
        Seat history reflects MMP-era general-election results; members are drawn from the tracked
        MP dataset (voted.nz).
      </footer>
    </main>
  );
}
