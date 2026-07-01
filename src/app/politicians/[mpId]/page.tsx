import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  FileText,
  History,
  Landmark,
  Vote,
  Wallet,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SpendByCategoryDonut, SpendTrendChart } from '@/components/money-charts';
import { MpPhoto } from '@/components/mp-photo';
import { MpTimeline } from '@/components/mp-timeline';
import { Reveal } from '@/components/reveal';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  buildMpTimeline,
  getBills,
  getExpenses,
  getMp,
  getMpEnrichment,
  getMps,
  getNewsForMp,
  getVotes,
  groupMpVotesByBill,
  partyLeader,
  summariseMpSpend,
  votesForMp,
} from '@/lib/data';
import { partyColor, partySlug } from '@/lib/party';
import { formatDayMonthYear, formatNZD, formatNZDCompact, formatPeriodRange } from '@/lib/utils';

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
    title: mp.name,
    description: `Profile for ${mp.name}${mp.party ? `, ${mp.party}` : ''}.`,
  };
}

function HeroStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:px-6 sm:py-4">
      <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase">
        {Icon ? <Icon className="size-3" aria-hidden /> : null}
        {label}
      </span>
      <span className="font-display text-xl font-semibold tabular-nums sm:text-2xl">{value}</span>
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
  const [mp, votesData, billsData, expensesData, enrichment, news] = await Promise.all([
    getMp(mpId),
    getVotes(),
    getBills(),
    getExpenses(),
    getMpEnrichment(mpId),
    getNewsForMp(mpId, 100),
  ]);
  if (!mp) notFound();

  const mpVotes = votesForMp(mpId, votesData.records);
  const voteGroups = groupMpVotesByBill(mpId, votesData.records, billsData.records);
  const timeline = buildMpTimeline(mpId, {
    votes: votesData.records,
    bills: billsData.records,
    expenses: expensesData.records,
    news,
  });
  const spend = summariseMpSpend(mpId, expensesData.records);
  const spendCategories = spend.byCategory.map((c) => ({
    category: c.category[0].toUpperCase() + c.category.slice(1),
    amount: c.amount,
  }));
  const spendFrom = spend.byPeriod[0]?.period ?? null;
  const spendTo = spend.byPeriod[spend.byPeriod.length - 1]?.period ?? null;
  const color = partyColor(mp.party);
  const leader = mp.party ? partyLeader(mp.party) : null;
  const isLeader = leader?.mpId === mp.mpId;

  return (
    <main id="main-content" className="mx-auto w-full max-w-4xl flex-1 px-6 py-12 sm:px-10">
      <Reveal>
        <Link
          href="/politicians"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          All politicians
        </Link>
      </Reveal>

      <Reveal delay={0.06} className="mt-6">
        <div className="border-border/50 bg-card/40 relative overflow-hidden rounded-3xl border backdrop-blur-sm">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(130% 120% at 0% 0%, ${color}38, transparent 55%), radial-gradient(120% 120% at 100% 0%, ${color}1f, transparent 50%)`,
            }}
            aria-hidden
          />
          <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:gap-8 sm:p-8">
            <div className="relative shrink-0">
              <div
                className="absolute -inset-2 rounded-[1.7rem] opacity-50 blur-xl"
                style={{ background: color }}
                aria-hidden
              />
              <MpPhoto mp={mp} size={176} priority className="relative rounded-2xl" />
              {isLeader ? (
                <span
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-[10px] font-semibold tracking-widest text-white uppercase shadow-lg"
                  style={{ backgroundColor: color }}
                >
                  Leader
                </span>
              ) : null}
            </div>

            <div className="flex flex-1 flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {mp.party ? (
                  <Link href={`/parties/${partySlug(mp.party)}`}>
                    <Badge
                      style={{ backgroundColor: color, color: '#fff' }}
                      className="border-transparent transition-opacity hover:opacity-90"
                    >
                      {mp.party}
                    </Badge>
                  </Link>
                ) : null}
                {mp.electorate ? (
                  <Badge variant="outline">
                    {/^list$/i.test(mp.electorate) ? 'List MP' : mp.electorate}
                  </Badge>
                ) : null}
                {mp.role ? <Badge variant="secondary">{mp.role}</Badge> : null}
              </div>
              <h1 className="font-display text-4xl leading-[0.95] font-bold tracking-tight text-balance sm:text-6xl">
                {mp.name}
              </h1>
              {enrichment?.description ? (
                <p className="text-muted-foreground max-w-2xl text-base sm:text-lg">
                  {enrichment.description}
                </p>
              ) : null}
            </div>
          </div>

          <div className="divide-border/50 border-border/50 relative grid grid-cols-2 divide-x divide-y border-t sm:grid-cols-4 sm:divide-y-0">
            <HeroStat label="Seat" value={mp.electorate ?? '—'} icon={Landmark} />
            <HeroStat label="Votes cast" value={String(mpVotes.length)} icon={Vote} />
            <HeroStat label="Bills voted" value={String(voteGroups.length)} icon={FileText} />
            <HeroStat
              label="Tracked spend"
              value={spend.total ? formatNZDCompact(spend.total) : '—'}
              icon={Wallet}
            />
          </div>
        </div>
      </Reveal>

      {enrichment?.extract ? (
        <Reveal delay={0.1} className="mt-6">
          <Card className="bg-card/60 backdrop-blur-sm">
            <CardContent className="flex flex-col gap-3">
              <p className="text-foreground/90 text-sm leading-relaxed sm:text-base">
                {enrichment.extract}
              </p>
              {enrichment.wikipediaUrl ? (
                <a
                  href={enrichment.wikipediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary inline-flex w-fit items-center gap-1.5 text-sm underline underline-offset-4"
                >
                  Read more on Wikipedia
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </a>
              ) : null}
            </CardContent>
          </Card>
        </Reveal>
      ) : null}

      {spend.total > 0 ? (
        <Reveal delay={0.12} className="mt-6">
          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="bg-card/60 backdrop-blur-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="text-muted-foreground size-4" aria-hidden />
                  Spending over time
                </CardTitle>
                <CardDescription>
                  Disclosed travel &amp; accommodation per quarter ·{' '}
                  {formatPeriodRange(spendFrom, spendTo)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SpendTrendChart data={spend.byPeriod} />
              </CardContent>
            </Card>
            <Card className="bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="text-muted-foreground size-4" aria-hidden />
                  By category
                </CardTitle>
                <CardDescription>
                  {formatNZD(spend.total)} total
                  {expensesData.meta.collectedAt
                    ? ` · as of ${formatDayMonthYear(expensesData.meta.collectedAt)}`
                    : ''}
                </CardDescription>
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
              <CardTitle className="flex items-center gap-2">
                <Vote className="text-muted-foreground size-4" aria-hidden />
                Voting record
              </CardTitle>
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
                      <ArrowRight className="text-muted-foreground size-3.5" aria-hidden />
                    </span>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </Reveal>
      ) : null}

      {timeline.length > 0 ? (
        <Reveal delay={0.18} className="mt-6">
          <Card className="bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="text-muted-foreground size-4" aria-hidden />
                Activity timeline
              </CardTitle>
              <CardDescription>
                Votes, expenses &amp; news for {mp.name}, most recent first
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MpTimeline events={timeline} name={mp.name} />
            </CardContent>
          </Card>
        </Reveal>
      ) : null}

      <Reveal delay={0.2} className="mt-6">
        <Card className="bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="text-muted-foreground size-4" aria-hidden />
              Sources
            </CardTitle>
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
