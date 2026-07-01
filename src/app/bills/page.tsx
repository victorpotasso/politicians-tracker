import { FileText, PenLine, Tag, Tags, ThumbsDown, ThumbsUp, Users, Vote } from 'lucide-react';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { BillsList } from '@/components/bills-list';
import { RankingList } from '@/components/ranking-list';
import { Reveal } from '@/components/reveal';
import { StatCard } from '@/components/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { billSubjects, subjectColor } from '@/lib/bill-subjects';
import {
  getBills,
  getVotes,
  rankBillsByDivisions,
  topBillProponents,
  topBillSubjects,
  topVotersByValue,
} from '@/lib/data';
import { partyColor } from '@/lib/party';

export const metadata: Metadata = {
  title: 'Bills',
  description: 'Bills with recorded personal (conscience) votes in the New Zealand Parliament.',
};

function StatRankCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof FileText;
  children: ReactNode;
}) {
  return (
    <Card className="bg-card/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="text-muted-foreground size-4" aria-hidden />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default async function BillsPage() {
  const [billsData, votesData] = await Promise.all([getBills(), getVotes()]);
  const ranks = rankBillsByDivisions(billsData.records, votesData.records);
  const divisionsById = new Map(ranks.map((r) => [r.billId, r.divisions]));

  const bills = billsData.records
    .map((bill) => ({
      ...bill,
      divisions: divisionsById.get(bill.billId) ?? 0,
      subjects: billSubjects(bill),
    }))
    .sort((a, b) => b.divisions - a.divisions);

  const totalDivisions = ranks.reduce((sum, r) => sum + r.divisions, 0);
  const votingMps = new Set(votesData.records.map((v) => v.mpId).filter(Boolean)).size;
  const subjectStats = topBillSubjects(billsData.records, 5);
  const subjectUniverse = new Set(bills.flatMap((b) => b.subjects)).size;
  const topAyes = topVotersByValue(votesData.records, 'aye', 5);
  const topNoes = topVotersByValue(votesData.records, 'nay', 5);
  const proponents = topBillProponents(billsData.records, 5);

  return (
    <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-6 py-12 sm:px-10">
      <Reveal>
        <header className="flex flex-col gap-2">
          <span className="text-muted-foreground inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase">
            <FileText className="size-3.5" aria-hidden />
            Legislation
          </span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Bills</h1>
          <p className="text-muted-foreground max-w-2xl">
            Bills with recorded personal votes. Open a bill to see each division and how every MP
            voted.
          </p>
        </header>
      </Reveal>

      <Reveal delay={0.06} className="mt-8">
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Bills"
            value={billsData.records.length}
            hint="With recorded votes"
            icon={FileText}
            accent="var(--chart-1)"
          />
          <StatCard
            label="Divisions"
            value={totalDivisions}
            hint="Recorded personal votes"
            icon={Vote}
            accent="var(--chart-2)"
          />
          <StatCard
            label="Subjects"
            value={subjectUniverse}
            hint="Distinct topics"
            icon={Tags}
            accent="var(--chart-3)"
          />
          <StatCard
            label="MPs voting"
            value={votingMps}
            hint="With a recorded vote"
            icon={Users}
            accent="var(--chart-4)"
          />
        </section>
      </Reveal>

      <Reveal delay={0.1} className="mt-4">
        <section className="grid gap-4 lg:grid-cols-2">
          <StatRankCard
            title="Most “Aye” votes"
            description="MPs who voted yes most often across recorded divisions"
            icon={ThumbsUp}
          >
            <RankingList
              items={topAyes.map((v) => ({
                label: v.name,
                value: v.count,
                href: `/politicians/${v.mpId}`,
                accent: partyColor(v.party),
                sublabel: v.party ?? undefined,
              }))}
            />
          </StatRankCard>

          <StatRankCard
            title="Most “No” votes"
            description="MPs who voted against most often across recorded divisions"
            icon={ThumbsDown}
          >
            <RankingList
              items={topNoes.map((v) => ({
                label: v.name,
                value: v.count,
                href: `/politicians/${v.mpId}`,
                accent: partyColor(v.party),
                sublabel: v.party ?? undefined,
              }))}
            />
          </StatRankCard>

          <StatRankCard
            title="Top subjects"
            description="The most common topics across tracked bills"
            icon={Tag}
          >
            <RankingList
              items={subjectStats.map((s) => ({
                label: s.subject,
                value: s.count,
                accent: subjectColor(s.subject),
              }))}
              formatValue={(n) => `${n} ${n === 1 ? 'bill' : 'bills'}`}
            />
          </StatRankCard>

          <StatRankCard
            title="Most bills sponsored"
            description="MPs who introduced the most bills"
            icon={PenLine}
          >
            {proponents.length > 0 ? (
              <RankingList
                items={proponents.map((p) => ({
                  label: p.name,
                  value: p.count,
                  href: p.mpId ? `/politicians/${p.mpId}` : undefined,
                }))}
              />
            ) : (
              <p className="text-muted-foreground py-2 text-sm">
                Bill sponsor data isn’t available in the current dataset — this ranking will fill in
                once proponents are collected.
              </p>
            )}
          </StatRankCard>
        </section>
      </Reveal>

      <Reveal delay={0.14} className="mt-8">
        <BillsList bills={bills} />
      </Reveal>
    </main>
  );
}
