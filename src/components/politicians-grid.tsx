'use client';

import { Search, Users, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo, useState } from 'react';

import { MpCard } from '@/components/mp-card';
import { partyColor } from '@/lib/party';
import { cn } from '@/lib/utils';
import type { MP } from '@/types/records';

export function PoliticiansGrid({ mps }: { mps: MP[] }) {
  const [query, setQuery] = useState('');
  const [party, setParty] = useState<string | null>(null);

  const partyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const mp of mps) if (mp.party) counts.set(mp.party, (counts.get(mp.party) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [mps]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mps
      .filter((mp) => (party ? mp.party === party : true))
      .filter((mp) =>
        q
          ? mp.name.toLowerCase().includes(q) || (mp.electorate ?? '').toLowerCase().includes(q)
          : true,
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [mps, query, party]);

  return (
    <div className="flex flex-col gap-6">
      <div className="border-border/50 from-card/70 to-card/30 relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 backdrop-blur-md sm:p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--chart-1), transparent 70%)' }}
        />

        <div className="relative flex flex-col gap-4">
          <div className="group relative">
            <Search className="text-muted-foreground group-focus-within:text-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 transition-colors" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or electorate…"
              className="border-border/60 bg-background/70 focus-visible:border-primary/50 focus-visible:ring-primary/20 h-11 w-full rounded-xl border pr-10 pl-10 text-sm outline-none transition focus-visible:ring-4"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterChip active={party === null} onClick={() => setParty(null)}>
              <Users className="size-3.5" />
              All
              <Count>{mps.length}</Count>
            </FilterChip>
            {partyCounts.map(([name, count]) => (
              <FilterChip key={name} active={party === name} onClick={() => setParty(name)}>
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: partyColor(name) }}
                  aria-hidden
                />
                {name}
                <Count>{count}</Count>
              </FilterChip>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <p className="text-muted-foreground text-xs">
          <span className="text-foreground font-medium tabular-nums">{filtered.length}</span> of{' '}
          {mps.length} MPs
          {party ? <span className="text-foreground"> · {party}</span> : null}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((mp) => (
          <MpCard key={mp.mpId} mp={mp} />
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          No MPs match your filters.
        </p>
      ) : null}
    </div>
  );
}

function Count({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-foreground/10 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums">
      {children}
    </span>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
        active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {active ? (
        <motion.span
          layoutId="party-filter-pill"
          className="bg-primary absolute inset-0 -z-10 rounded-full"
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        />
      ) : (
        <span className="border-border/60 absolute inset-0 -z-10 rounded-full border" />
      )}
      {children}
    </button>
  );
}
