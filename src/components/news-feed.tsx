'use client';

import { ExternalLink, Filter, Newspaper, Radio, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import type { NewsArticleView } from '@/lib/data';
import { partyColor, partySlug } from '@/lib/party';
import { cn, formatDayMonthYear } from '@/lib/utils';
import type { NewsSource } from '@/types/records';

type SourceFilter = 'all' | NewsSource;

interface NewsFeedProps {
  articles: NewsArticleView[];
  parties: string[];
}

const SOURCE_TABS: { value: SourceFilter; label: string }[] = [
  { value: 'all', label: 'All sources' },
  { value: 'RNZ', label: 'RNZ' },
  { value: 'NZ Herald', label: 'NZ Herald' },
];

/** RNZ RSS is licensed for personal use only — do not republish its text. */
function canShowSummary(source: NewsSource): boolean {
  return source === 'NZ Herald';
}

function SourceBadge({ source }: { source: NewsSource }) {
  const isRnz = source === 'RNZ';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
        isRnz
          ? 'bg-sky-500/15 text-sky-600 dark:text-sky-300'
          : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300',
      )}
    >
      {isRnz ? (
        <Radio className="size-3" aria-hidden />
      ) : (
        <Newspaper className="size-3" aria-hidden />
      )}
      {source}
    </span>
  );
}

function ArticleCard({ article }: { article: NewsArticleView }) {
  const showSummary = canShowSummary(article.source) && article.summary;
  const showImage = article.source === 'NZ Herald' && article.imageUrl;

  return (
    <article className="border-border/50 bg-card/40 hover:border-border group flex gap-4 rounded-2xl border p-4 backdrop-blur-sm transition-colors sm:p-5">
      {showImage ? (
        // biome-ignore lint/performance/noImgElement: remote editorial thumbnails from arbitrary CDNs.
        <img
          src={article.imageUrl as string}
          alt=""
          loading="lazy"
          className="hidden size-24 shrink-0 rounded-xl object-cover sm:block"
        />
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <SourceBadge source={article.source} />
          <span className="text-muted-foreground text-xs tabular-nums">
            {formatDayMonthYear(article.publishedAt)}
          </span>
          {article.author ? (
            <span className="text-muted-foreground truncate text-xs">· {article.author}</span>
          ) : null}
        </div>

        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground group-hover:text-primary inline-flex items-start gap-1.5 text-base font-semibold leading-snug text-balance transition-colors"
        >
          {article.title}
          <ExternalLink
            className="mt-1 size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-70"
            aria-hidden
          />
        </a>

        {showSummary ? (
          <p className="text-muted-foreground line-clamp-2 text-sm">{article.summary}</p>
        ) : null}

        {article.mentioned.length > 0 || article.parties.length > 0 ? (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {article.mentioned.map((mp) => (
              <Link key={mp.mpId} href={`/politicians/${mp.mpId}`}>
                <Badge
                  variant="outline"
                  className="hover:bg-accent gap-1.5 font-medium transition-colors"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: partyColor(mp.party) }}
                    aria-hidden
                  />
                  {mp.name}
                </Badge>
              </Link>
            ))}
            {article.parties.map((party) => (
              <Link key={party} href={`/parties/${partySlug(party)}`}>
                <Badge
                  style={{ backgroundColor: partyColor(party), color: '#fff' }}
                  className="border-transparent transition-opacity hover:opacity-90"
                >
                  {party}
                </Badge>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function NewsFeed({ articles, parties }: NewsFeedProps) {
  const [source, setSource] = useState<SourceFilter>('all');
  const [party, setParty] = useState<string>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((a) => {
      if (source !== 'all' && a.source !== source) return false;
      if (party !== 'all' && !a.parties.includes(party)) return false;
      if (
        q &&
        !a.title.toLowerCase().includes(q) &&
        !(a.summary ?? '').toLowerCase().includes(q) &&
        !a.mentioned.some((m) => m.name.toLowerCase().includes(q))
      ) {
        return false;
      }
      return true;
    });
  }, [articles, source, party, query]);

  return (
    <div className="flex flex-col gap-6">
      <div className="border-border/50 bg-card/30 flex flex-col gap-4 rounded-2xl border p-4 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2">
          {SOURCE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setSource(tab.value)}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                source === tab.value
                  ? 'bg-secondary text-foreground ring-border ring-1'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
          <div className="relative ml-auto w-full sm:w-64">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search headlines & politicians"
              className="border-border bg-background/60 focus:ring-ring w-full rounded-lg border py-2 pr-3 pl-9 text-sm outline-none focus:ring-2"
            />
          </div>
        </div>

        {parties.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground mr-1 inline-flex items-center gap-1.5 text-xs">
              <Filter className="size-3" aria-hidden />
              Party
            </span>
            <button
              type="button"
              onClick={() => setParty('all')}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                party === 'all'
                  ? 'bg-secondary text-foreground ring-border ring-1'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              All
            </button>
            {parties.map((p) => {
              const active = party === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setParty(active ? 'all' : p)}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-medium transition-opacity',
                    !active && 'opacity-70 hover:opacity-100',
                  )}
                  style={{ backgroundColor: partyColor(p), color: '#fff' }}
                >
                  {p}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <p className="text-muted-foreground text-sm">
        {filtered.length} {filtered.length === 1 ? 'article' : 'articles'}
      </p>

      {filtered.length > 0 ? (
        <div className="grid gap-3">
          {filtered.map((article) => (
            <ArticleCard key={article.articleId} article={article} />
          ))}
        </div>
      ) : (
        <div className="border-border/50 text-muted-foreground rounded-2xl border border-dashed p-10 text-center text-sm">
          No articles match your filters.
        </div>
      )}
    </div>
  );
}
