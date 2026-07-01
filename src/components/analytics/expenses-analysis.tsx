'use client';

import { Banknote, Layers, ListChecks, Users, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  type AnalyticsFilters,
  Chip,
  matchesMp,
  SectionLabel,
} from '@/components/analytics/controls';
import { PartySpendChart, type PartySpendRow } from '@/components/analytics-charts';
import { SpendByCategoryDonut, SpendTrendChart } from '@/components/money-charts';
import { RankingList } from '@/components/ranking-list';
import { StatCard } from '@/components/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { EnrichedExpense } from '@/lib/analytics';
import { partyColor } from '@/lib/party';
import { formatNZD, formatNZDCompact, formatQuarterFull } from '@/lib/utils';

const CATEGORIES = ['accommodation', 'travel', 'other'] as const;
const CATEGORY_LABEL: Record<string, string> = {
  accommodation: 'Accommodation',
  travel: 'Travel',
  other: 'Other',
};

interface ExpensesAnalysisProps {
  rows: EnrichedExpense[];
  periods: string[];
  filters: AnalyticsFilters;
}

/** Expense cross-analysis: who spends, on what, when — reshaped by the filters. */
export function ExpensesAnalysis({ rows, periods, filters }: ExpensesAnalysisProps) {
  const [activePeriods, setActivePeriods] = useState<Set<string>>(() => new Set(periods));
  const [activeCategories, setActiveCategories] = useState<Set<string>>(() => new Set(CATEGORIES));

  const togglePeriod = (period: string) =>
    setActivePeriods((prev) => {
      const next = new Set(prev);
      if (next.has(period)) next.delete(period);
      else next.add(period);
      return next;
    });

  const toggleCategory = (category: string) =>
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          matchesMp(filters, r.party, r.name) &&
          (filters.seatType === 'all' || r.seatType === filters.seatType) &&
          activePeriods.has(r.period) &&
          activeCategories.has(r.category),
      ),
    [rows, filters, activePeriods, activeCategories],
  );

  const analysis = useMemo(() => {
    const byCategory = new Map<string, number>();
    const byPeriod = new Map<string, number>();
    const byParty = new Map<string, PartySpendRow>();
    const byMp = new Map<
      string,
      {
        name: string;
        party: string;
        seatType: string;
        accommodation: number;
        travel: number;
        other: number;
        total: number;
      }
    >();
    let total = 0;

    for (const r of filtered) {
      total += r.amount;
      byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + r.amount);
      byPeriod.set(r.period, (byPeriod.get(r.period) ?? 0) + r.amount);

      const party = byParty.get(r.party) ?? {
        party: r.party,
        accommodation: 0,
        travel: 0,
        other: 0,
        total: 0,
      };
      party[r.category as 'accommodation' | 'travel' | 'other'] += r.amount;
      party.total += r.amount;
      byParty.set(r.party, party);

      const mp = byMp.get(r.mpId) ?? {
        name: r.name,
        party: r.party,
        seatType: r.seatType,
        accommodation: 0,
        travel: 0,
        other: 0,
        total: 0,
      };
      mp[r.category as 'accommodation' | 'travel' | 'other'] += r.amount;
      mp.total += r.amount;
      byMp.set(r.mpId, mp);
    }

    const mpEntries = [...byMp.entries()].sort((a, b) => b[1].total - a[1].total);

    return {
      total,
      mpCount: byMp.size,
      byCategory: [...byCategory.entries()]
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount),
      byPeriod: [...byPeriod.entries()]
        .map(([period, amount]) => ({ period, amount }))
        .sort((a, b) => a.period.localeCompare(b.period)),
      partyRows: [...byParty.values()].sort((a, b) => b.total - a.total),
      topSpenders: mpEntries.slice(0, 12).map(([mpId, m]) => ({
        label: m.name,
        value: m.total,
        accent: partyColor(m.party),
        href: `/politicians/${mpId}`,
        sublabel: m.party,
      })),
      tableRows: mpEntries.slice(0, 25).map(([mpId, m]) => ({ mpId, ...m })),
    };
  }, [filtered]);

  const topCategory = analysis.byCategory[0];
  const avgPerMp = analysis.mpCount > 0 ? analysis.total / analysis.mpCount : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Section controls */}
      <div className="border-border/50 bg-card/40 flex flex-col gap-5 rounded-2xl border p-4 backdrop-blur-sm sm:p-5">
        <div className="flex flex-col gap-3">
          <SectionLabel icon={ListChecks}>Quarters — tap to include</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {periods.map((period) => (
              <Chip
                key={period}
                active={activePeriods.has(period)}
                onClick={() => togglePeriod(period)}
              >
                {formatQuarterFull(period)}
              </Chip>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <SectionLabel icon={Layers}>Categories</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((category) => (
              <Chip
                key={category}
                active={activeCategories.has(category)}
                onClick={() => toggleCategory(category)}
              >
                {CATEGORY_LABEL[category]}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total spend"
          value={formatNZDCompact(analysis.total)}
          hint="Matched expense records"
          icon={Banknote}
          accent="var(--chart-1)"
        />
        <StatCard
          label="MPs"
          value={analysis.mpCount}
          hint="With spend in view"
          icon={Users}
          accent="var(--chart-2)"
        />
        <StatCard
          label="Average per MP"
          value={formatNZDCompact(avgPerMp)}
          hint="Total ÷ MPs in view"
          icon={Wallet}
          accent="var(--chart-3)"
        />
        <StatCard
          label="Top category"
          value={topCategory ? CATEGORY_LABEL[topCategory.category] : '—'}
          hint={topCategory ? formatNZDCompact(topCategory.amount) : undefined}
          icon={Layers}
          accent="var(--chart-4)"
        />
      </div>

      {analysis.mpCount === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          No expenses match the current filters.
        </p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="bg-card/60 backdrop-blur-sm lg:col-span-2">
              <CardHeader>
                <CardTitle>Top spenders</CardTitle>
                <CardDescription>Highest total recorded spend in the current view.</CardDescription>
              </CardHeader>
              <CardContent>
                <RankingList items={analysis.topSpenders} formatValue={formatNZD} />
              </CardContent>
            </Card>
            <Card className="bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>By category</CardTitle>
                <CardDescription>Share of spend across categories.</CardDescription>
              </CardHeader>
              <CardContent>
                <SpendByCategoryDonut data={analysis.byCategory} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Spend over time</CardTitle>
                <CardDescription>Total recorded spend per quarter.</CardDescription>
              </CardHeader>
              <CardContent>
                <SpendTrendChart data={analysis.byPeriod} />
              </CardContent>
            </Card>
            <Card className="bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>By party</CardTitle>
                <CardDescription>Spend per party, split by category.</CardDescription>
              </CardHeader>
              <CardContent>
                <PartySpendChart data={analysis.partyRows} />
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Per-MP breakdown</CardTitle>
              <CardDescription>Top 25 by total spend in the current view.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MP</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Seat</TableHead>
                    <TableHead className="text-right">Accommodation</TableHead>
                    <TableHead className="text-right">Travel</TableHead>
                    <TableHead className="text-right">Other</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis.tableRows.map((row) => (
                    <TableRow key={row.mpId}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: partyColor(row.party) }}
                            aria-hidden
                          />
                          {row.party}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground capitalize">
                        {row.seatType}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNZD(row.accommodation)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNZD(row.travel)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNZD(row.other)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatNZD(row.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
