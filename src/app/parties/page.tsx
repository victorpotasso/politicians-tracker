import type { Metadata } from 'next';

import { PartyCard } from '@/components/party-card';
import { Reveal } from '@/components/reveal';
import { ShaderBackground } from '@/components/shaders/shader-background';
import { StatCard } from '@/components/stat-card';
import { getPartySummaries } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Parties · NZ Politicians Tracker',
  description:
    'Browse the political parties of the New Zealand Parliament — seats, government terms, and members.',
};

export default async function PartiesPage() {
  const parties = await getPartySummaries();

  const seatedNow = parties.filter((p) => p.currentSeats);
  const governing = parties.filter((p) => p.inGovernmentNow);

  return (
    <>
      <ShaderBackground />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-14 sm:px-10">
        <Reveal>
          <header className="flex flex-col gap-3">
            <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
              New Zealand · Political parties
            </span>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Parties</h1>
            <p className="text-muted-foreground max-w-2xl text-balance">
              Every party that has held seats across the MMP era, linked to its members and its
              record in the House. Select a party to see its seat history, governments, and MPs.
            </p>
          </header>
        </Reveal>

        <Reveal delay={0.08}>
          <section className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Parties" value={parties.length} hint="Across all terms" />
            <StatCard label="Seated now" value={seatedNow.length} hint="Current Parliament" />
            <StatCard label="In government" value={governing.length} hint="Current coalition" />
            <StatCard
              label="Largest"
              value={seatedNow[0]?.currentSeats ?? '—'}
              hint={seatedNow[0]?.party}
            />
          </section>
        </Reveal>

        <Reveal delay={0.16}>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {parties.map((party) => (
              <PartyCard key={party.slug} party={party} />
            ))}
          </section>
        </Reveal>

        <footer className="text-muted-foreground mt-16 flex flex-wrap items-center justify-between gap-2 border-t pt-6 text-xs">
          <span>
            Party members are drawn from the tracked MP dataset (voted.nz); seat history reflects
            MMP-era general-election results (1996–2023).
          </span>
          <span>{parties.length} parties</span>
        </footer>
      </main>
    </>
  );
}
