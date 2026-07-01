import type { Metadata } from 'next';

import { BillsList } from '@/components/bills-list';
import { Reveal } from '@/components/reveal';
import { getBills, getVotes, rankBillsByDivisions } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Bills · NZ Politicians Tracker',
  description: 'Bills with recorded personal (conscience) votes in the New Zealand Parliament.',
};

export default async function BillsPage() {
  const [billsData, votesData] = await Promise.all([getBills(), getVotes()]);
  const ranks = rankBillsByDivisions(billsData.records, votesData.records);
  const divisionsById = new Map(ranks.map((r) => [r.billId, r.divisions]));

  const bills = billsData.records
    .map((bill) => ({ ...bill, divisions: divisionsById.get(bill.billId) ?? 0 }))
    .sort((a, b) => b.divisions - a.divisions);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12 sm:px-10">
      <Reveal>
        <header className="flex flex-col gap-2">
          <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
            Legislation
          </span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Bills</h1>
          <p className="text-muted-foreground max-w-2xl">
            Bills with recorded personal votes. Open a bill to see each division and how every MP
            voted.
          </p>
        </header>
      </Reveal>

      <Reveal delay={0.08} className="mt-8">
        <BillsList bills={bills} />
      </Reveal>
    </main>
  );
}
