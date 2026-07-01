'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDayMonthYear } from '@/lib/utils';
import type { Bill } from '@/types/records';

interface BillRow extends Bill {
  divisions: number;
}

export function BillsList({ bills }: { bills: BillRow[] }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bills;
    return bills.filter(
      (b) => b.title.toLowerCase().includes(q) || (b.abstract ?? '').toLowerCase().includes(q),
    );
  }, [bills, query]);

  return (
    <div className="flex flex-col gap-5">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search bills…"
        className="border-input bg-background/60 focus-visible:ring-ring/50 h-10 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px] sm:max-w-md"
      />

      <p className="text-muted-foreground text-xs">
        {filtered.length} of {bills.length} bills
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((bill) => (
          <Link key={bill.billId} href={`/bills/${bill.billId}`} className="group">
            <Card className="bg-card/60 group-hover:border-primary/40 h-full py-5 backdrop-blur-sm transition-colors">
              <CardContent className="flex h-full flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-medium leading-snug">{bill.title}</h3>
                  <Badge variant="secondary" className="shrink-0">
                    {bill.divisions} {bill.divisions === 1 ? 'vote' : 'votes'}
                  </Badge>
                </div>
                {bill.abstract ? (
                  <p className="text-muted-foreground line-clamp-3 text-sm">{bill.abstract}</p>
                ) : null}
                {bill.introducedDate ? (
                  <p className="text-muted-foreground/70 mt-auto pt-1 text-xs">
                    First recorded {formatDayMonthYear(bill.introducedDate)}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">No bills match “{query}”.</p>
      ) : null}
    </div>
  );
}
