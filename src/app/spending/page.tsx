import { Banknote, CalendarRange, Landmark, LineChart } from 'lucide-react';
import type { Metadata } from 'next';

import { Reveal } from '@/components/reveal';
import { ShaderBackground } from '@/components/shaders/shader-background';
import { SpendingExplorer } from '@/components/spending-explorer';
import { StatCard } from '@/components/stat-card';
import { getSpending } from '@/lib/data';
import { headlineSpend, mandateForYear, spendPctGdp } from '@/lib/spending';
import { formatMillionsNZD } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Government spending',
  description:
    'New Zealand Crown spending by fiscal year from the Treasury Fiscal Time Series (1972–2025). Filter the bar chart by year range and governing mandate, switch between Core Crown, Total Crown and % of GDP, and drill into where the money goes.',
};

export default async function SpendingPage() {
  const { records, meta } = await getSpending();
  const latest = records[records.length - 1] ?? null;
  const earliest = records[0] ?? null;
  const latestSpend = latest ? headlineSpend(latest) : null;
  const latestPct = latest ? spendPctGdp(latest) : null;
  const latestMandate = latest ? mandateForYear(latest.year) : null;

  return (
    <>
      <ShaderBackground />
      <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-6 py-14 sm:px-10">
        <Reveal>
          <header className="flex flex-col gap-3">
            <span className="text-muted-foreground inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase">
              <Banknote className="size-3.5" aria-hidden />
              New Zealand · {earliest?.year}–{latest?.year} · Treasury Fiscal Time Series
            </span>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Government spending
            </h1>
            <p className="text-muted-foreground max-w-2xl text-balance">
              Crown expenses by fiscal year, straight from the Treasury&rsquo;s authoritative Fiscal
              Time Series. Filter the bars by year range and governing mandate, switch measures, and
              see how each government&rsquo;s spending compares in dollars and against the size of
              the economy.
            </p>
          </header>
        </Reveal>

        <Reveal delay={0.08}>
          <section className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label={`Latest spend (${latest?.year ?? '—'})`}
              value={latestSpend !== null ? formatMillionsNZD(latestSpend) : '—'}
              hint="Core Crown expenses"
              icon={Banknote}
              accent="var(--chart-5)"
            />
            <StatCard
              label="Share of GDP"
              value={latestPct !== null ? `${latestPct.toFixed(1)}%` : '—'}
              hint="Core Crown / nominal GDP"
              icon={LineChart}
              accent="var(--chart-2)"
            />
            <StatCard
              label="Current government"
              value={latestMandate?.pm ?? '—'}
              hint={latestMandate?.party ?? undefined}
              icon={Landmark}
              accent="var(--chart-3)"
            />
            <StatCard
              label="Years covered"
              value={records.length}
              hint="Annual series"
              icon={CalendarRange}
              accent="var(--chart-1)"
            />
          </section>
        </Reveal>

        <Reveal delay={0.16}>
          <section className="mt-8">
            <SpendingExplorer records={records} />
          </section>
        </Reveal>

        <footer className="text-muted-foreground mt-16 flex flex-wrap items-center justify-between gap-2 border-t pt-6 text-xs">
          <span>
            Source: The Treasury,{' '}
            <em>Fiscal Time Series: Historical Fiscal Indicators 1972–2025</em> (Crown Copyright, CC
            BY 4.0). Figures are in NZD millions; fiscal years end 31 March to 1989 and 30 June
            thereafter. Mandates map each fiscal year to the government in office at its start and
            are indicative.
          </span>
          <span>{meta.count} years</span>
        </footer>
      </main>
    </>
  );
}
