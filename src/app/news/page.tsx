import { Landmark, Newspaper, Radio, Users } from 'lucide-react';
import type { Metadata } from 'next';

import { NewsFeed } from '@/components/news-feed';
import { Reveal } from '@/components/reveal';
import { ShaderBackground } from '@/components/shaders/shader-background';
import { StatCard } from '@/components/stat-card';
import { getMps, getNews, withMentionedMps } from '@/lib/data';
import { formatDayMonthYear } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'News',
  description:
    'Latest New Zealand politics coverage from RNZ and the NZ Herald, cross-referenced against the MP roster so you can follow the politicians and parties in each story.',
};

export default async function NewsPage() {
  const [news, mps] = await Promise.all([getNews(), getMps()]);
  const articles = withMentionedMps(news.records, mps.records);

  // Parties available as filters, ordered by how often they feature.
  const partyCounts = new Map<string, number>();
  for (const article of articles) {
    for (const party of article.parties) {
      partyCounts.set(party, (partyCounts.get(party) ?? 0) + 1);
    }
  }
  const parties = [...partyCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([party]) => party);

  const mpsMentioned = new Set(articles.flatMap((a) => a.mentions)).size;
  const latestDate = articles[0]?.publishedAt ?? null;

  return (
    <>
      <ShaderBackground />
      <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-6 py-14 sm:px-10">
        <Reveal>
          <header className="flex flex-col gap-3">
            <span className="text-muted-foreground inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase">
              <Newspaper className="size-3.5" aria-hidden />
              RNZ · NZ Herald
            </span>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">In the news</h1>
            <p className="text-muted-foreground max-w-2xl text-balance">
              Politics headlines from RNZ and the NZ Herald, matched to the MPs and parties they
              mention. Tap a politician to jump to their profile. Articles link out to the original
              source.
            </p>
          </header>
        </Reveal>

        <Reveal delay={0.08}>
          <section className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Articles"
              value={articles.length}
              hint="Across both sources"
              icon={Newspaper}
              accent="var(--chart-2)"
            />
            <StatCard
              label="Sources"
              value={2}
              hint="RNZ & NZ Herald"
              icon={Radio}
              accent="var(--chart-1)"
            />
            <StatCard
              label="MPs featured"
              value={mpsMentioned}
              hint="Named in coverage"
              icon={Users}
              accent="var(--chart-3)"
            />
            <StatCard
              label="Latest"
              value={latestDate ? formatDayMonthYear(latestDate) : '—'}
              hint="Most recent story"
              icon={Landmark}
              accent="var(--chart-4)"
            />
          </section>
        </Reveal>

        <Reveal delay={0.12} className="mt-10">
          <NewsFeed articles={articles} parties={parties} />
        </Reveal>
      </main>
    </>
  );
}
