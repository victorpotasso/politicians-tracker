import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BadgeCheck,
  Database,
  ExternalLink,
  FileSpreadsheet,
  GitBranch,
  Landmark,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Vote,
  WalletCards,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Reveal } from '@/components/reveal';
import { ShaderBackground } from '@/components/shaders/shader-background';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getBills, getExpenses, getMinisterExpenses, getMps, getVotes } from '@/lib/data';

export const metadata: Metadata = {
  title: 'About · NZ Politicians Tracker',
  description:
    'Learn how NZ Politicians Tracker collects and explains public New Zealand political data.',
};

const numberFormat = new Intl.NumberFormat('en-NZ');

function formatCount(value: number) {
  return numberFormat.format(value);
}

function formatDate(value: string) {
  if (!value) return 'Pending collection';
  return new Intl.DateTimeFormat('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

interface SourceCardProps {
  icon: LucideIcon;
  title: string;
  eyebrow: string;
  description: string;
  href: string;
  linkLabel: string;
  stat: string;
  external?: boolean;
}

function SourceCard({
  icon: Icon,
  title,
  eyebrow,
  description,
  href,
  linkLabel,
  stat,
  external = false,
}: SourceCardProps) {
  const linkClassName =
    'inline-flex items-center gap-2 text-sm font-medium text-cyan-100 transition-colors group-hover:text-white';

  return (
    <Card className="group overflow-hidden border-white/10 bg-white/4.5 shadow-2xl shadow-black/20 backdrop-blur-md transition-colors hover:border-white/25">
      <CardHeader className="gap-5">
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-11 place-items-center rounded-lg bg-white/10 text-white ring-1 ring-white/15">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">
            {stat}
          </span>
        </div>
        <div>
          <p className="text-xs uppercase text-cyan-100/70">{eyebrow}</p>
          <CardTitle className="mt-2 text-xl leading-tight">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-6">
        <p className="text-sm leading-6 text-slate-200/78">{description}</p>
        {external ? (
          <a href={href} target="_blank" rel="noreferrer" className={linkClassName}>
            {linkLabel}
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        ) : (
          <Link href={href} className={linkClassName}>
            {linkLabel}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

export default async function AboutPage() {
  const [mpsData, billsData, votesData, expensesData, ministerExpensesData] = await Promise.all([
    getMps(),
    getBills(),
    getVotes(),
    getExpenses(),
    getMinisterExpenses(),
  ]);

  const totalRecords =
    mpsData.records.length +
    billsData.records.length +
    votesData.records.length +
    expensesData.records.length +
    ministerExpensesData.records.length;
  const latestUpdate = [mpsData, billsData, votesData, expensesData, ministerExpensesData]
    .map((dataset) => dataset.meta.collectedAt)
    .filter(Boolean)
    .sort()
    .pop();

  const metrics = [
    { label: 'Public records', value: formatCount(totalRecords), icon: Database },
    { label: 'MP profiles', value: formatCount(mpsData.records.length), icon: Landmark },
    { label: 'Recorded votes', value: formatCount(votesData.records.length), icon: Vote },
    { label: 'Expense rows', value: formatCount(expensesData.records.length), icon: WalletCards },
  ];

  const sources = [
    {
      icon: Vote,
      title: 'voted.nz divisions and MP pages',
      eyebrow: 'Votes and people',
      description:
        'The dashboard uses voted.nz for MP roster data, bill divisions, and personal vote positions. The source is published under CC-BY 4.0 and ultimately reflects Parliament voting records.',
      href: 'https://voted.nz/divisions',
      linkLabel: 'Open voted.nz divisions',
      stat: `${formatCount(billsData.records.length)} bills`,
      external: true,
    },
    {
      icon: FileSpreadsheet,
      title: 'data.govt.nz MP expenses',
      eyebrow: 'Member spending',
      description:
        'Quarterly XLSX releases from the Parliamentary Service are fetched through the data.govt.nz CKAN API, normalized, and matched back to politician profiles.',
      href: 'https://catalogue.data.govt.nz/api/3/action/package_show?id=member-of-parliament-expenses',
      linkLabel: 'Open CKAN package',
      stat: `${formatCount(expensesData.records.length)} rows`,
      external: true,
    },
    {
      icon: ShieldCheck,
      title: 'DIA minister expense releases',
      eyebrow: 'Minister transparency',
      description:
        'The project keeps a collector surface for Department of Internal Affairs minister expense releases, so Cabinet travel and office spending can sit beside MP-level expenses when available.',
      href: 'https://www.dia.govt.nz/Ministers-expense-releases',
      linkLabel: 'Open DIA releases',
      stat: `${formatCount(ministerExpensesData.records.length)} rows`,
      external: true,
    },
    {
      icon: GitBranch,
      title: 'Local JSON snapshots',
      eyebrow: 'Reproducible cache',
      description:
        'Collectors write typed JSON into the repository, making the dashboard inspectable, portable, and easy to refresh without hiding the data behind a private service.',
      href: '/',
      linkLabel: 'Open the dashboard',
      stat: formatDate(latestUpdate ?? ''),
    },
  ];

  const pipeline = [
    {
      icon: Search,
      title: 'Collect',
      text: 'Fetch machine-readable public datasets and keep the raw source URLs visible.',
    },
    {
      icon: BadgeCheck,
      title: 'Normalize',
      text: 'Turn names, parties, expense columns, bills, and vote labels into consistent records.',
    },
    {
      icon: RefreshCw,
      title: 'Connect',
      text: 'Match expense rows and votes back to MPs so each profile becomes a useful data trail.',
    },
    {
      icon: Sparkles,
      title: 'Explain',
      text: 'Render the records as rankings, charts, profiles, and prompts for civic curiosity.',
    },
  ];

  return (
    <>
      <ShaderBackground />
      <main id="main-content" className="w-full flex-1 overflow-hidden">
        <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 pb-14 pt-12 sm:px-10 lg:grid-cols-[1fr_0.86fr] lg:items-center lg:pb-20 lg:pt-16">
          <Reveal>
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1 text-sm text-cyan-100 shadow-lg shadow-cyan-950/20">
                <Sparkles className="size-4" aria-hidden="true" />
                Civic data, made explorable
              </span>
              <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.95] text-white sm:text-7xl lg:text-8xl">
                Turn public records into political signals.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200/82">
                NZ Politicians Tracker is an experimental, source-first dashboard for exploring New
                Zealand MPs, bills, votes, and expenses. It is built to make civic information feel
                less like a spreadsheet archive and more like a living map of public
                decision-making.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/politicians">
                    Browse politicians
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/">View dashboard</Link>
                </Button>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="relative min-h-104 overflow-hidden rounded-lg border border-white/10 bg-black/30 p-5 shadow-2xl shadow-black/35 backdrop-blur-md">
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.22),transparent_34%),linear-gradient(45deg,rgba(250,204,21,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent)]"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-size-[28px_28px] opacity-30"
              />
              <div className="relative flex h-full min-h-92 flex-col justify-between">
                <div className="flex items-center justify-between gap-4 text-sm text-slate-200/70">
                  <span>Open data poster</span>
                  <span>{formatDate(latestUpdate ?? '')}</span>
                </div>
                <div aria-hidden="true" className="py-8">
                  <p className="font-mono text-[clamp(3.4rem,12vw,8.8rem)] font-black leading-[0.78] text-white mix-blend-screen">
                    PUBLIC
                    <br />
                    POWER
                    <br />
                    DATA
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                  {metrics.map((metric) => {
                    const Icon = metric.icon;
                    return (
                      <div
                        key={metric.label}
                        className="rounded-lg border border-white/10 bg-white/6 p-3 backdrop-blur-sm"
                      >
                        <Icon className="mb-3 size-4 text-amber-200" aria-hidden="true" />
                        <p className="text-xl font-bold text-white">{metric.value}</p>
                        <p className="mt-1 text-xs text-slate-300/75">{metric.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        <Reveal delay={0.12}>
          <section className="border-y border-white/10 bg-white/[0.035] py-10 backdrop-blur-sm">
            <div className="mx-auto grid w-full max-w-6xl gap-4 px-6 sm:px-10 md:grid-cols-3">
              <div>
                <p className="text-sm text-cyan-100/70">Project idea</p>
                <h2 className="mt-2 text-3xl font-bold text-white">
                  A civic observatory, not a black box.
                </h2>
              </div>
              <p className="text-sm leading-7 text-slate-200/78 md:col-span-2">
                The goal is to collect public political data, preserve where it came from, and
                create interfaces that help people compare patterns: who sits in Parliament, what
                gets voted on, which bills attract divisions, and how public expense disclosures map
                back to elected representatives. It is a proof of concept, not an official
                Parliament product.
              </p>
            </div>
          </section>
        </Reveal>

        <section className="mx-auto w-full max-w-6xl px-6 py-14 sm:px-10 lg:py-16">
          <Reveal delay={0.16}>
            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm text-cyan-100/70">Sources</p>
                <h2 className="mt-2 text-3xl font-bold text-white">Where the data comes from</h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-slate-300/75">
                Source pages are linked directly so the dashboard remains auditable as it grows.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-4 md:grid-cols-2">
            {sources.map((source, index) => (
              <Reveal key={source.title} delay={0.2 + index * 0.04}>
                <SourceCard {...source} />
              </Reveal>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 pb-14 sm:px-10 lg:pb-16">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1fr] lg:items-start">
            <Reveal delay={0.2}>
              <div className="sticky top-24 rounded-lg border border-white/10 bg-black/25 p-6 backdrop-blur-md">
                <p className="text-sm text-cyan-100/70">How it works</p>
                <h2 className="mt-3 text-3xl font-bold text-white">
                  From scattered releases to a usable map.
                </h2>
                <p className="mt-5 text-sm leading-7 text-slate-300/78">
                  Each collector is intentionally small: fetch from public URLs, normalize into a
                  typed shape, write JSON, then let the app render from local data. That keeps the
                  system easy to inspect and cheap to rerun with{' '}
                  <code className="rounded bg-white/10 px-1.5 py-0.5 text-cyan-100">
                    pnpm data:collect
                  </code>
                  .
                </p>
              </div>
            </Reveal>

            <div className="grid gap-3">
              {pipeline.map((step, index) => {
                const Icon = step.icon;
                return (
                  <Reveal key={step.title} delay={0.24 + index * 0.04}>
                    <div className="grid gap-4 rounded-lg border border-white/10 bg-white/4.5 p-5 backdrop-blur-md sm:grid-cols-[auto_1fr]">
                      <div className="flex items-center gap-3 sm:flex-col">
                        <span className="grid size-11 place-items-center rounded-lg bg-amber-200/12 text-amber-100 ring-1 ring-amber-100/20">
                          <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <span className="font-mono text-xs text-slate-400">0{index + 1}</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-300/78">{step.text}</p>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        <Reveal delay={0.28}>
          <section className="mx-auto w-full max-w-6xl px-6 pb-16 sm:px-10">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-cyan-300/10 p-6 text-cyan-50 backdrop-blur-md">
                <h2 className="text-2xl font-bold">What it helps answer</h2>
                <p className="mt-4 text-sm leading-7 text-cyan-50/78">
                  Which parties are represented? Which bills generated repeated divisions? How do MP
                  expense releases line up across quarters? Which politicians have the richest
                  public trail in the collected data?
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-amber-300/10 p-6 text-amber-50 backdrop-blur-md">
                <h2 className="text-2xl font-bold">Known limits</h2>
                <p className="mt-4 text-sm leading-7 text-amber-50/78">
                  Some official pages are difficult to collect reliably, so this project prefers
                  machine-readable public datasets and clearly marked best-effort collectors. The
                  dashboard should be read as a research interface, not a legal record.
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-lime-300/10 p-6 text-lime-50 backdrop-blur-md">
                <h2 className="text-2xl font-bold">What comes next</h2>
                <p className="mt-4 text-sm leading-7 text-lime-50/78">
                  Better bill metadata, clearer attribution, richer vote comparison, and expense
                  trends over time. The direction is simple: more transparency, less friction, and
                  no mystery about the source trail.
                </p>
              </div>
            </div>
          </section>
        </Reveal>
      </main>
    </>
  );
}
