'use client';

import { ArrowRight, Banknote, ExternalLink, Newspaper, Vote } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { TimelineEvent, TimelineKind } from '@/lib/data';
import { cn, formatDayMonthYear, formatNZDCompact } from '@/lib/utils';

type KindFilter = 'all' | TimelineKind;

interface MpTimelineProps {
  events: TimelineEvent[];
  /** MP display name, for the empty-state copy. */
  name: string;
}

const FILTERS: { value: KindFilter; label: string }[] = [
  { value: 'all', label: 'All activity' },
  { value: 'vote', label: 'Votes' },
  { value: 'expense', label: 'Expenses' },
  { value: 'news', label: 'News' },
];

const KIND_STYLES: Record<
  TimelineKind,
  { icon: typeof Vote; ring: string; dot: string; text: string }
> = {
  vote: {
    icon: Vote,
    ring: 'ring-emerald-500/25',
    dot: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  expense: {
    icon: Banknote,
    ring: 'ring-amber-500/25',
    dot: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    text: 'text-amber-600 dark:text-amber-400',
  },
  news: {
    icon: Newspaper,
    ring: 'ring-sky-500/25',
    dot: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
    text: 'text-sky-600 dark:text-sky-400',
  },
};

function voteTone(vote: TimelineEvent['vote']): string {
  if (vote === 'aye') return 'text-emerald-600 dark:text-emerald-400';
  if (vote === 'nay') return 'text-rose-600 dark:text-rose-400';
  return 'text-muted-foreground';
}

function EventBody({ event }: { event: TimelineEvent }) {
  const detailTone = event.kind === 'vote' ? voteTone(event.vote) : 'text-muted-foreground';
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm font-medium text-balance">{event.title}</p>
        {event.amount != null ? (
          <span className="text-foreground shrink-0 text-sm font-semibold tabular-nums">
            {formatNZDCompact(event.amount)}
          </span>
        ) : null}
        {event.href ? (
          <ArrowRight className="text-muted-foreground mt-0.5 size-3.5 shrink-0" aria-hidden />
        ) : null}
        {event.url ? (
          <ExternalLink
            className="text-muted-foreground mt-0.5 size-3.5 shrink-0 opacity-60 transition-opacity group-hover:opacity-100"
            aria-hidden
          />
        ) : null}
      </div>
      <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
        <span className="tabular-nums">{formatDayMonthYear(event.date)}</span>
        {event.detail ? (
          <>
            <span aria-hidden>·</span>
            <span className={detailTone}>{event.detail}</span>
          </>
        ) : null}
      </div>
    </>
  );
}

function TimelineRow({ event }: { event: TimelineEvent }) {
  const style = KIND_STYLES[event.kind];
  const Icon = style.icon;

  const inner = (
    <div className="flex gap-3">
      <div className="relative flex flex-col items-center">
        <span
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-full ring-1',
            style.dot,
            style.ring,
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="bg-border/60 mt-1 w-px flex-1" aria-hidden />
      </div>
      <div
        className={cn(
          'mb-4 min-w-0 flex-1 rounded-xl px-3 py-2.5 transition-colors',
          (event.href || event.url) && 'group-hover:bg-accent/40',
        )}
      >
        <EventBody event={event} />
      </div>
    </div>
  );

  if (event.href) {
    return (
      <Link href={event.href} className="group block">
        {inner}
      </Link>
    );
  }
  if (event.url) {
    return (
      <a href={event.url} target="_blank" rel="noopener noreferrer" className="group block">
        {inner}
      </a>
    );
  }
  return <div className="group block">{inner}</div>;
}

export function MpTimeline({ events, name }: MpTimelineProps) {
  const [filter, setFilter] = useState<KindFilter>('all');

  const counts = useMemo(() => {
    const c: Record<KindFilter, number> = { all: events.length, vote: 0, expense: 0, news: 0 };
    for (const e of events) c[e.kind] += 1;
    return c;
  }, [events]);

  const filtered = useMemo(
    () => (filter === 'all' ? events : events.filter((e) => e.kind === filter)),
    [events, filter],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((tab) => {
          const active = filter === tab.value;
          const count = counts[tab.value];
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              disabled={count === 0}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-secondary text-foreground ring-border ring-1'
                  : 'text-muted-foreground hover:text-foreground',
                count === 0 && 'cursor-not-allowed opacity-40',
              )}
            >
              {tab.label}
              <span className="text-muted-foreground ml-1.5 text-xs tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length > 0 ? (
        <div className="flex flex-col">
          {filtered.map((event) => (
            <TimelineRow key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="border-border/50 text-muted-foreground rounded-2xl border border-dashed p-8 text-center text-sm">
          No {filter === 'all' ? '' : `${filter} `}activity recorded for {name}.
        </div>
      )}
    </div>
  );
}
