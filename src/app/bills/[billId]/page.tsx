import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Reveal } from '@/components/reveal';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TallyBar, VoteColumn } from '@/components/vote-breakdown';
import { divisionsForBill, getBill, getBills, getVotes } from '@/lib/data';

interface Params {
  params: Promise<{ billId: string }>;
}

export async function generateStaticParams() {
  const { records } = await getBills();
  return records.map((bill) => ({ billId: bill.billId }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { billId } = await params;
  const bill = await getBill(billId);
  if (!bill) return { title: 'Bill not found' };
  return {
    title: bill.title,
    description: bill.abstract ?? undefined,
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function BillDetailPage({ params }: Params) {
  const { billId } = await params;
  const [bill, votesData] = await Promise.all([getBill(billId), getVotes()]);
  if (!bill) notFound();

  const divisions = divisionsForBill(billId, votesData.records);
  const totalVotes = divisions.reduce((sum, d) => sum + d.votes.length, 0);

  return (
    <main id="main-content" className="mx-auto w-full max-w-4xl flex-1 px-6 py-12 sm:px-10">
      <Reveal>
        <Link href="/bills" className="text-muted-foreground hover:text-foreground text-sm">
          ← All bills
        </Link>
      </Reveal>

      <Reveal delay={0.06} className="mt-6">
        <Card className="bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{divisions.length} divisions</Badge>
              <Badge variant="outline">{totalVotes} MP votes recorded</Badge>
              {bill.introducedDate ? (
                <span className="text-muted-foreground text-xs">
                  First recorded {formatDate(bill.introducedDate)}
                </span>
              ) : null}
            </div>
            <CardTitle className="mt-2 text-2xl">{bill.title}</CardTitle>
          </CardHeader>
          {bill.abstract ? (
            <CardContent>
              <p className="text-muted-foreground text-sm leading-relaxed">{bill.abstract}</p>
            </CardContent>
          ) : null}
        </Card>
      </Reveal>

      <section className="mt-8 flex flex-col gap-4">
        {divisions.map((division, index) => (
          <Reveal key={division.voteId} delay={0.04 * index}>
            <Card className="bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">{division.issue ?? 'Division'}</CardTitle>
                  <span className="text-muted-foreground text-xs">{formatDate(division.date)}</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-xs font-medium text-emerald-500">{division.ayes} aye</span>
                  <div className="flex-1">
                    <TallyBar ayes={division.ayes} noes={division.noes} />
                  </div>
                  <span className="text-xs font-medium text-rose-500">{division.noes} no</span>
                </div>
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-2">
                <VoteColumn
                  title="Ayes"
                  tone="aye"
                  votes={division.votes.filter((v) => v.vote === 'aye')}
                />
                <VoteColumn
                  title="Noes"
                  tone="nay"
                  votes={division.votes.filter((v) => v.vote === 'nay')}
                />
              </CardContent>
            </Card>
          </Reveal>
        ))}

        {divisions.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No individual vote records are available for this bill yet. Run{' '}
            <code>pnpm data:collect votes</code> to populate them.
          </p>
        ) : null}
      </section>

      <p className="text-muted-foreground mt-8 text-xs">Source: {bill.sourceUrl}</p>
    </main>
  );
}
