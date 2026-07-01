import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SpendByCategoryDonut, SpendTrendChart } from '@/components/money-charts';
import { MpPhoto } from '@/components/mp-photo';
import { Reveal } from '@/components/reveal';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getBills,
  getExpenses,
  getMp,
  getMps,
  getVotes,
  groupMpVotesByBill,
  summariseMpSpend,
  votesForMp,
} from '@/lib/data';
import { partyColor, partySlug } from '@/lib/party';
import { formatNZD } from '@/lib/utils';

interface Params {
  params: Promise<{ mpId: string }>;
}

export async function generateStaticParams() {
  const { records } = await getMps();
  return records.map((mp) => ({ mpId: mp.mpId }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { mpId } = await params;
  const mp = await getMp(mpId);
  if (!mp) return { title: 'Politician not found' };
  return {
    title: `${mp.name} · NZ Politicians Tracker`,
    description: `Profile for ${mp.name}${mp.party ? `, ${mp.party}` : ''}.`,
  };
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs tracking-wide uppercase">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

function positionLabel(ayes: number, noes: number): { text: string; tone: string } {
  if (ayes > 0 && noes === 0) return { text: 'Consistently for', tone: 'text-emerald-500' };
  if (noes > 0 && ayes === 0) return { text: 'Consistently against', tone: 'text-rose-500' };
  return { text: 'Mixed', tone: 'text-amber-500' };
}

export default async function PoliticianProfilePage({ params }: Params) {
  const { mpId } = await params;
  const [mp, votesData, billsData, expensesData] = await Promise.all([
    getMp(mpId),
    getVotes(),
    getBills(),
    getExpenses(),
  ]);
  if (!mp) notFound();

  const mpVotes = votesForMp(mpId, votesData.records);
  const voteGroups = groupMpVotesByBill(mpId, votesData.records, billsData.records);
  const spend = summariseMpSpend(mpId, expensesData.records);
  const spendCategories = spend.byCategory.map((c) => ({
    category: c.category[0].toUpperCase() + c.category.slice(1),
    amount: c.amount,
  }));

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12 sm:px-10">
      <Reveal>
        <Link href="/politicians" className="text-muted-foreground hover:text-foreground text-sm">
          ← All politicians
        </Link>
      </Reveal>

      <Reveal delay={0.06} className="mt-6">
        <Card className="bg-card/60 backdrop-blur-sm">
          <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <MpPhoto mp={mp} size={160} priority className="shrink-0" />
            <div className="flex flex-1 flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-semibold tracking-tight">{mp.name}</h1>
                  {mp.party ? (
                    <Link href={`/parties/${partySlug(mp.party)}`}>
                      <Badge
                        style={{ backgroundColor: partyColor(mp.party), color: '#fff' }}
                        className="border-transparent transition-opacity hover:opacity-90"
                      >
                        {mp.party}
                      </Badge>
                    </Link>
                  ) : null}
                </div>
                {mp.role ? <p className="text-muted-foreground">{mp.role}</p> : null}
              </div>

              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Detail label="Electorate" value={mp.electorate ?? '—'} />
                <Detail label="Votes cast" value={String(mpVotes.length)} />
                <Detail label="Bills voted" value={String(voteGroups.length)} />
                <Detail label="Tracked spend" value={spend.total ? formatNZD(spend.total) : '—'} />
              </dl>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      {spend.total > 0 ? (
        <Reveal delay={0.12} className="mt-6">
          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="bg-card/60 backdrop-blur-sm lg:col-span-2">
              <CardHeader>
                <CardTitle>Spending over time</CardTitle>
                <CardDescription>Disclosed travel &amp; accommodation per quarter</CardDescription>
              </CardHeader>
              <CardContent>
                <SpendTrendChart data={spend.byPeriod} />
              </CardContent>
            </Card>
            <Card className="bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>By category</CardTitle>
                <CardDescription>{formatNZD(spend.total)} total</CardDescription>
              </CardHeader>
              <CardContent>
                <SpendByCategoryDonut data={spendCategories} />
              </CardContent>
            </Card>
          </section>
        </Reveal>
      ) : null}

      {voteGroups.length > 0 ? (
        <Reveal delay={0.16} className="mt-6">
          <Card className="bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Voting record</CardTitle>
              <CardDescription>
                How {mp.name} voted on {voteGroups.length} bills
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col divide-y">
              {voteGroups.map((group) => {
                const position = positionLabel(group.ayes, group.noes);
                return (
                  <Link
                    key={group.billId}
                    href={`/bills/${group.billId}`}
                    className="hover:bg-accent/40 -mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-3 transition-colors"
                  >
                    <span className="min-w-0 truncate text-sm font-medium">{group.billTitle}</span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className={`text-xs font-medium ${position.tone}`}>
                        {position.text}
                      </span>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {group.votes.length} {group.votes.length === 1 ? 'vote' : 'votes'}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </Reveal>
      ) : null}

      <Reveal delay={0.2} className="mt-6">
        <Card className="bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Sources</CardTitle>
            <CardDescription>All data is collected locally and attributed</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-xs">
            <SourceRow label="Profile & roster" url={mp.sourceUrl} />
            {mpVotes[0] ? <SourceRow label="Voting record" url={mpVotes[0].sourceUrl} /> : null}
            {expensesData.records.find((e) => e.mpId === mpId) ? (
              <SourceRow
                label="Expenses"
                url={expensesData.records.find((e) => e.mpId === mpId)?.sourceUrl ?? ''}
              />
            ) : null}
          </CardContent>
        </Card>
      </Reveal>
    </main>
  );
}

function SourceRow({ label, url }: { label: string; url: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="text-foreground/80 break-all">{url}</span>
    </div>
  );
}
