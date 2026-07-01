import { CalendarDays, Flag, Landmark, Trophy } from 'lucide-react';
import type { Metadata } from 'next';

import { ParliamentChart } from '@/components/parliament-chart';
import { Reveal } from '@/components/reveal';
import { ShaderBackground } from '@/components/shaders/shader-background';
import { StatCard } from '@/components/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getMps } from '@/lib/data';
import { PARLIAMENT_TERMS } from '@/lib/parliament-data';

export const metadata: Metadata = {
  title: 'Parliament',
  description:
    'Explore the composition of the New Zealand Parliament across the MMP era with an interactive, year-by-year seating chart.',
};

export default async function ParliamentPage() {
  const terms = PARLIAMENT_TERMS;
  const { records: mps } = await getMps();
  const first = terms[0];
  const latest = terms[terms.length - 1];

  const distinctParties = new Set(terms.flatMap((t) => t.parties.map((p) => p.party)));
  const largestEver = terms
    .flatMap((t) => t.parties.map((p) => ({ ...p, year: t.year })))
    .reduce((a, b) => (b.seats > a.seats ? b : a));

  return (
    <>
      <ShaderBackground />
      <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-6 py-14 sm:px-10">
        <Reveal>
          <header className="flex flex-col gap-3">
            <span className="text-muted-foreground inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase">
              <Landmark className="size-3.5" aria-hidden />
              New Zealand · House of Representatives
            </span>
            <h1 className="font-display text-4xl font-bold tracking-tight sm:text-6xl">
              Parliament
            </h1>
            <p className="text-muted-foreground max-w-2xl text-balance">
              An interactive seating chart of the House across the MMP era. Drag the timeline or
              pick an election year to watch the balance of power shift from {first.year} to{' '}
              {latest.year}.
            </p>
          </header>
        </Reveal>

        <Reveal delay={0.08}>
          <section className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Elections"
              value={terms.length}
              hint="MMP era, 1996–present"
              icon={CalendarDays}
              accent="var(--chart-1)"
            />
            <StatCard
              label="Parties seated"
              value={distinctParties.size}
              hint="Across all terms"
              icon={Flag}
              accent="var(--chart-2)"
            />
            <StatCard
              label="Largest bloc"
              value={largestEver.seats}
              hint={`${largestEver.party} (${largestEver.year})`}
              icon={Trophy}
              accent="var(--chart-4)"
            />
            <StatCard
              label="Current seats"
              value={latest.totalSeats}
              hint={`${latest.year} House`}
              icon={Landmark}
              accent="var(--chart-3)"
            />
          </section>
        </Reveal>

        <Reveal delay={0.16}>
          <section className="mt-8">
            <Card className="bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Landmark className="text-muted-foreground size-4" aria-hidden />
                  Seating chart
                </CardTitle>
                <CardDescription>
                  Each dot is a seat, coloured by party and arranged left to right along the
                  political spectrum. Hover to isolate a party, or click a seat to see who holds it.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ParliamentChart terms={terms} mps={mps} />
              </CardContent>
            </Card>
          </section>
        </Reveal>

        <footer className="text-muted-foreground mt-16 flex flex-wrap items-center justify-between gap-2 border-t pt-6 text-xs">
          <span>
            Composition reflects final general-election results for each MMP-era Parliament
            (1996–2023).
          </span>
          <span>{terms.length} parliamentary terms</span>
        </footer>
      </main>
    </>
  );
}
