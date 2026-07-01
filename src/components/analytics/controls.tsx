'use client';

import type { LucideIcon } from 'lucide-react';

import type { SeatType } from '@/lib/analytics';
import { cn } from '@/lib/utils';

/** Global filters shared by the expenses, electorate and voting analyses. */
export interface AnalyticsFilters {
  /** Selected canonical parties; empty means "all parties". */
  parties: Set<string>;
  /** Seat-type filter; `all` keeps both electorate and list MPs. */
  seatType: SeatType | 'all';
  /** Free-text MP name query. */
  query: string;
}

/** Apply the party + name-query filters that every MP-centric section shares. */
export function matchesMp(filters: AnalyticsFilters, party: string, name: string): boolean {
  if (filters.parties.size > 0 && !filters.parties.has(party)) return false;
  const q = filters.query.trim().toLowerCase();
  if (q && !name.toLowerCase().includes(q)) return false;
  return true;
}

/** Small uppercase eyebrow label that introduces a group of controls. */
export function SectionLabel({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <span className="text-muted-foreground inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase">
      <Icon className="size-3.5" aria-hidden />
      {children}
    </span>
  );
}

/** A rounded pill toggle used across the analytics filter controls. */
export function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-transparent bg-foreground text-background'
          : 'border-border text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

/** A tiny inline count badge for chips and labels. */
export function CountBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-foreground/10 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums">
      {children}
    </span>
  );
}
