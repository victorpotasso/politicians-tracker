'use client';

import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { MP } from '@/types/records';

export function MpTable({ mps }: { mps: MP[] }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mps;
    return mps.filter(
      (mp) =>
        mp.name.toLowerCase().includes(q) ||
        (mp.party ?? '').toLowerCase().includes(q) ||
        (mp.electorate ?? '').toLowerCase().includes(q),
    );
  }, [mps, query]);

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, party, or electorate…"
        className="border-input bg-background/60 focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px] sm:max-w-sm"
      />
      <div className="border-border/60 bg-card/50 max-h-[28rem] overflow-y-auto rounded-lg border backdrop-blur-sm">
        <Table>
          <TableHeader className="bg-card/80 sticky top-0 backdrop-blur">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Party</TableHead>
              <TableHead>Electorate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((mp) => (
              <TableRow key={mp.mpId}>
                <TableCell className="font-medium">
                  {mp.role ? <span className="text-muted-foreground">{mp.role} </span> : null}
                  {mp.name}
                </TableCell>
                <TableCell>
                  {mp.party ? <Badge variant="secondary">{mp.party}</Badge> : '—'}
                </TableCell>
                <TableCell className="text-muted-foreground">{mp.electorate ?? '—'}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground py-8 text-center">
                  No MPs match “{query}”.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
      <p className="text-muted-foreground text-xs">
        Showing {filtered.length} of {mps.length} MPs.
      </p>
    </div>
  );
}
