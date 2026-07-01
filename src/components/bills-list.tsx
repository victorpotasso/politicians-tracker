'use client';

import { CalendarDays, FileText, Search, Vote } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { subjectColor } from '@/lib/bill-subjects';
import { cn, formatDayMonthYear } from '@/lib/utils';
import type { Bill } from '@/types/records';

interface BillRow extends Bill {
  divisions: number;
  subjects: string[];
}

export function BillsList({ bills }: { bills: BillRow[] }) {
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState<string | null>(null);

  const subjects = useMemo(() => {
    const counts = new Map<string, number>();
    for (const bill of bills) {
      for (const s of bill.subjects) counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([s]) => s);
  }, [bills]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bills.filter((b) => {
      if (subject && !b.subjects.includes(subject)) return false;
      if (
        q &&
        !b.title.toLowerCase().includes(q) &&
        !(b.abstract ?? '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [bills, query, subject]);

  return (
    <div className="flex flex-col gap-5">
      <div className="group relative sm:max-w-md">
        <Search className="text-muted-foreground group-focus-within:text-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 transition-colors" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search bills…"
          className="border-input bg-background/60 focus-visible:ring-ring/50 h-10 w-full rounded-md border pr-3 pl-9 text-sm outline-none focus-visible:ring-[3px]"
        />
      </div>

      {subjects.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubject(null)}
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
              subject === null
                ? 'bg-secondary text-foreground ring-border ring-1'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            All subjects
          </button>
          {subjects.map((s) => {
            const active = subject === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSubject(active ? null : s)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium transition-opacity',
                  !active && 'opacity-75 hover:opacity-100',
                )}
                style={{ backgroundColor: subjectColor(s), color: '#fff' }}
              >
                {s}
              </button>
            );
          })}
        </div>
      ) : null}

      <p className="text-muted-foreground text-xs">
        {filtered.length} of {bills.length} bills
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((bill) => (
          <Link key={bill.billId} href={`/bills/${bill.billId}`} className="group">
            <Card className="bg-card/60 group-hover:border-primary/40 h-full py-5 backdrop-blur-sm transition-colors">
              <CardContent className="flex h-full flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="flex min-w-0 items-start gap-2 font-medium leading-snug">
                    <FileText
                      className="text-muted-foreground mt-0.5 size-4 shrink-0"
                      aria-hidden
                    />
                    <span>{bill.title}</span>
                  </h3>
                  <Badge variant="secondary" className="shrink-0">
                    <Vote aria-hidden />
                    {bill.divisions} {bill.divisions === 1 ? 'vote' : 'votes'}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {bill.subjects.map((s) => (
                    <Badge
                      key={s}
                      className="border-transparent text-[10px] font-medium"
                      style={{ backgroundColor: `${subjectColor(s)}22`, color: subjectColor(s) }}
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
                {bill.abstract ? (
                  <p className="text-muted-foreground line-clamp-3 text-sm">{bill.abstract}</p>
                ) : null}
                {bill.introducedDate ? (
                  <p className="text-muted-foreground/70 mt-auto flex items-center gap-1.5 pt-1 text-xs">
                    <CalendarDays className="size-3.5" aria-hidden />
                    First recorded {formatDayMonthYear(bill.introducedDate)}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          No bills match your filters.
        </p>
      ) : null}
    </div>
  );
}
