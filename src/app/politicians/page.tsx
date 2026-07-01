import type { Metadata } from 'next';

import { PoliticiansGrid } from '@/components/politicians-grid';
import { Reveal } from '@/components/reveal';
import { getMps } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Politicians · NZ Politicians Tracker',
  description: 'Browse current and former New Zealand Members of Parliament.',
};

export default async function PoliticiansPage() {
  const { records: mps } = await getMps();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12 sm:px-10">
      <Reveal>
        <header className="flex flex-col gap-2">
          <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
            Members of Parliament
          </span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Politicians</h1>
          <p className="text-muted-foreground max-w-2xl">
            Browse {mps.length} current and former MPs. Select a politician to view their profile.
          </p>
        </header>
      </Reveal>

      <Reveal delay={0.08} className="mt-8">
        <PoliticiansGrid mps={mps} />
      </Reveal>
    </main>
  );
}
