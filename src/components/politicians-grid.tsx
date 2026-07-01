'use client';

import { useMemo, useState } from 'react';

import { MpCard } from '@/components/mp-card';
import { cn } from '@/lib/utils';
import type { MP } from '@/types/records';

export function PoliticiansGrid({ mps }: { mps: MP[] }) {
  const [query, setQuery] = useState('');
  const [party, setParty] = useState<string | null>(null);

  const parties = useMemo(() => {
    const set = new Set<string>();
    for (const mp of mps) if (mp.party) set.add(mp.party);
    return [...set].sort();
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
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search MPs by name or electorate…"
          className="border-input bg-background/60 focus-visible:ring-ring/50 h-10 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px] sm:max-w-md"
        />
        <div className="flex flex-wrap gap-2">
          <FilterChip active={party === null} onClick={() => setParty(null)}>
            All
          </FilterChip>
          {parties.map((p) => (
            <FilterChip key={p} active={party === p} onClick={() => setParty(p)}>
              {p}
            </FilterChip>
          ))}
        </div>
      </div>

      <p className="text-muted-foreground text-xs">
        {filtered.length} of {mps.length} MPs
      </p>

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
        'rounded-full border px-3 py-1 text-xs transition-colors',
        active
          ? 'bg-primary text-primary-foreground border-transparent'
          : 'border-border/60 text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
