'use client';

import { AlertTriangle, Flame, Gauge, ScanSearch, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';

import { type AnalyticsFilters, matchesMp } from '@/components/analytics/controls';
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
import { detectSpendingInsights, type EnrichedExpense } from '@/lib/analytics';
import { partyColor } from '@/lib/party';
import { formatNZD, formatNZDCompact, formatQuarterFull } from '@/lib/utils';

interface ScrutinyAnalysisProps {
  rows: EnrichedExpense[];
  filters: AnalyticsFilters;
}

/**
 * Investigative layer: statistical outliers and single-quarter spikes in
 * disclosed spending. Computed over whatever the filters select, so you can ask
 * "who's unusual within this party / seat type?" — always with the caveat that
 * unusual is not the same as improper.
 */
export function ScrutinyAnalysis({ rows, filters }: ScrutinyAnalysisProps) {
  const insights = useMemo(() => {
    const filtered = rows.filter(
      (r) =>
        matchesMp(filters, r.party, r.name) &&
        (filters.seatType === 'all' || r.seatType === filters.seatType),
    );
    return detectSpendingInsights(filtered);
  }, [rows, filters]);

  const topOutlier = insights.outliers[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="border-border/60 bg-amber-500/5 text-muted-foreground flex items-start gap-3 rounded-xl border border-dashed p-4 text-sm">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
        <p>
          These are{' '}
          <span className="text-foreground font-medium">statistical flags, not verdicts</span>.
          Outliers are MPs whose total spend is 1.5+ standard deviations above the group average;
          spikes are quarters more than 1.8× an MP&rsquo;s own norm. High spend is often entirely
          legitimate — a remote electorate, a ministerial travel load. Treat each as a question, not
          an answer, and check the source records before drawing conclusions.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Group average"
          value={formatNZDCompact(insights.cohortAverage)}
          hint={`${insights.mpCount} MPs`}
          icon={Gauge}
          accent="var(--chart-2)"
        />
        <StatCard
          label="Spending outliers"
          value={insights.outliers.length}
          hint="≥ 1.5σ above average"
          icon={ScanSearch}
          accent="var(--chart-4)"
        />
        <StatCard
          label="Quarter spikes"
          value={insights.spikes.length}
          hint="≥ 1.8× own baseline"
          icon={Flame}
          accent="var(--chart-5)"
        />
        <StatCard
          label="Biggest outlier"
          value={topOutlier ? `${topOutlier.vsAverage.toFixed(1)}×` : '—'}
          hint={topOutlier?.name}
          icon={TrendingUp}
          accent="var(--chart-1)"
        />
      </div>

      {insights.mpCount === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          No expenses match the current filters.
        </p>
      ) : (
        <>
          <Card className="bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Spending under scrutiny</CardTitle>
              <CardDescription>
                MPs whose total disclosed spend sits furthest above their peers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insights.outliers.length > 0 ? (
                <RankingList
                  items={insights.outliers.map((o) => ({
                    label: o.name,
                    value: o.total,
                    accent: partyColor(o.party),
                    href: `/politicians/${o.mpId}`,
                    sublabel: `${o.party} · ${o.vsAverage.toFixed(1)}× avg`,
                  }))}
                  formatValue={formatNZD}
                />
              ) : (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  No outliers in the current view.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Unusual quarters</CardTitle>
              <CardDescription>
                A single quarter far above the MP&rsquo;s own running average.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insights.spikes.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>MP</TableHead>
                      <TableHead>Party</TableHead>
                      <TableHead>Quarter</TableHead>
                      <TableHead className="text-right">Spend</TableHead>
                      <TableHead className="text-right">vs own avg</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {insights.spikes.map((s) => (
                      <TableRow key={`${s.mpId}-${s.period}`}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: partyColor(s.party) }}
                              aria-hidden
                            />
                            {s.party}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatQuarterFull(s.period)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatNZD(s.amount)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {s.ratio.toFixed(1)}×
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  No unusual quarters in the current view.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
