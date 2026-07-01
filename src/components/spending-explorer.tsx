'use client';

import {
  Banknote,
  BarChart3,
  CalendarDays,
  CalendarRange,
  Gauge,
  Landmark,
  PiggyBank,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  type SpendingBar,
  SpendingBarChart,
  SpendingBreakdownChart,
} from '@/components/spending-charts';
import { StatCard } from '@/components/stat-card';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { YearRangePicker, type YearRangePreset } from '@/components/year-range-picker';
import { partyColor } from '@/lib/party';
import {
  mandateForYear,
  mandatesInRange,
  metricValue,
  SPENDING_METRICS,
  type SpendingMetric,
  spendPctGdp,
} from '@/lib/spending';
import { cn, formatMillionsNZD } from '@/lib/utils';
import type { SpendingYear } from '@/types/records';

interface SpendingExplorerProps {
  records: SpendingYear[];
}

function formatMetric(value: number | null, percent: boolean): string {
  if (value === null) return '—';
  return percent ? `${value.toFixed(1)}%` : formatMillionsNZD(value);
}

/** Interactive Crown-spending explorer: metric, year range and mandate filters. */
export function SpendingExplorer({ records }: SpendingExplorerProps) {
  const years = records.map((r) => r.year);
  const dataMin = Math.min(...years);
  const dataMax = Math.max(...years);

  const [metric, setMetric] = useState<SpendingMetric>('core');
  const [from, setFrom] = useState(dataMin);
  const [to, setTo] = useState(dataMax);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [breakdownYear, setBreakdownYear] = useState<number | null>(null);

  const metricMeta = SPENDING_METRICS.find((m) => m.id === metric) ?? SPENDING_METRICS[0];
  const percent = metricMeta.percent;

  // Keep the two range thumbs ordered regardless of which the user drags.
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);

  const setRange = ([nextFrom, nextTo]: [number, number]) => {
    setFrom(nextFrom);
    setTo(nextTo);
  };

  const rangePresets: YearRangePreset[] = [
    { label: 'All years', from: dataMin, to: dataMax },
    { label: '21st century', from: Math.max(dataMin, 2000), to: dataMax },
    { label: 'Last 20 years', from: Math.max(dataMin, dataMax - 19), to: dataMax },
    { label: 'Last 10 years', from: Math.max(dataMin, dataMax - 9), to: dataMax },
  ];

  const rangeMandates = useMemo(() => mandatesInRange(lo, hi), [lo, hi]);

  const visible = useMemo(
    () =>
      records.filter(
        (r) => r.year >= lo && r.year <= hi && !excluded.has(mandateForYear(r.year)?.id ?? ''),
      ),
    [records, lo, hi, excluded],
  );

  const bars: SpendingBar[] = useMemo(
    () =>
      visible
        .map((r) => {
          const mandate = mandateForYear(r.year);
          const value = metricValue(r, metric);
          return {
            year: r.year,
            value,
            color: partyColor(mandate?.party),
            pm: mandate ? `${mandate.pm} · ${mandate.party}` : 'Government unknown',
            party: mandate?.party ?? '',
          };
        })
        .filter((b) => b.value !== null),
    [visible, metric],
  );

  // Headline figures over the visible window.
  const withValue = bars.filter((b) => b.value !== null) as (SpendingBar & { value: number })[];
  const peak = withValue.reduce<(SpendingBar & { value: number }) | null>(
    (best, b) => (best === null || b.value > best.value ? b : best),
    null,
  );
  const firstV = withValue[0];
  const lastV = withValue[withValue.length - 1];
  const growth =
    firstV && lastV && firstV.value !== 0
      ? ((lastV.value - firstV.value) / firstV.value) * 100
      : null;

  // Functional breakdown for a chosen year (defaults to the latest with data).
  const breakdownCandidates = visible.filter((r) => r.categories.length > 0);
  const effectiveBreakdownYear =
    breakdownCandidates.find((r) => r.year === breakdownYear)?.year ??
    breakdownCandidates[breakdownCandidates.length - 1]?.year ??
    null;
  const breakdownRecord = records.find((r) => r.year === effectiveBreakdownYear) ?? null;
  const breakdownData = (breakdownRecord?.categories ?? [])
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const toggleMandate = (id: string) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex flex-col gap-6">
      {/* Metric selector */}
      <div className="flex flex-col gap-3">
        <span className="text-muted-foreground inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase">
          <Gauge className="size-3.5" aria-hidden />
          Measure
        </span>
        <div
          className="flex flex-wrap gap-1.5"
          role="tablist"
          aria-label="Choose a spending metric"
        >
          {SPENDING_METRICS.map((m) => {
            const active = m.id === metric;
            return (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMetric(m.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'border-transparent bg-foreground text-background'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                <BarChart3 className="size-3.5" aria-hidden />
                {m.label}
              </button>
            );
          })}
        </div>
        <p className="text-muted-foreground text-sm">{metricMeta.description}</p>
      </div>

      {/* Year range */}
      <div className="flex flex-col gap-3">
        <span className="text-muted-foreground inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase">
          <CalendarRange className="size-3.5" aria-hidden />
          Period
        </span>
        <YearRangePicker
          min={dataMin}
          max={dataMax}
          from={from}
          to={to}
          onChange={setRange}
          presets={rangePresets}
        />
      </div>

      {/* Mandate filter / legend */}
      <div className="flex flex-col gap-3">
        <span className="text-muted-foreground inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase">
          <Landmark className="size-3.5" aria-hidden />
          Governments (mandates) — tap to toggle
        </span>
        <div className="flex flex-wrap gap-1.5">
          {rangeMandates.map((mandate) => {
            const active = !excluded.has(mandate.id);
            return (
              <button
                key={mandate.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggleMandate(mandate.id)}
                title={mandate.note}
                className={cn(
                  'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  active
                    ? 'border-border text-foreground'
                    : 'border-border/50 text-muted-foreground line-through opacity-60',
                )}
              >
                <span
                  className="size-2.5 shrink-0 rounded-full ring-1 ring-white/10"
                  style={{ backgroundColor: partyColor(mandate.party) }}
                  aria-hidden
                />
                {mandate.pm}
                <span className="text-muted-foreground">
                  {mandate.fromYear}–{mandate.toYear}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={`Latest (${lastV?.year ?? '—'})`}
          value={lastV ? formatMetric(lastV.value, percent) : '—'}
          hint={metricMeta.short}
          icon={Banknote}
          accent="var(--chart-5)"
        />
        <StatCard
          label="Peak"
          value={peak ? formatMetric(peak.value, percent) : '—'}
          hint={peak ? `Year ended ${peak.year}` : undefined}
          icon={Trophy}
          accent="var(--chart-1)"
        />
        <StatCard
          label="Change over range"
          value={growth === null ? '—' : `${growth > 0 ? '+' : ''}${growth.toFixed(0)}%`}
          hint={firstV && lastV ? `${firstV.year} → ${lastV.year}` : undefined}
          icon={TrendingUp}
          accent="var(--chart-2)"
        />
        <StatCard
          label="Years shown"
          value={withValue.length}
          hint={`${lo}–${hi}`}
          icon={CalendarRange}
          accent="var(--chart-3)"
        />
      </div>

      {/* Bar chart */}
      <Card className="bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="text-muted-foreground size-4" aria-hidden />
            {metricMeta.label} by fiscal year
          </CardTitle>
          <CardDescription>
            {percent
              ? 'Core Crown expenses as a share of nominal GDP'
              : 'NZD, bars coloured by the governing party of the day'}{' '}
            · {lo}–{hi}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bars.length > 0 ? (
            <SpendingBarChart data={bars} percent={percent} />
          ) : (
            <p className="text-muted-foreground py-16 text-center text-sm">
              No data for the selected filters.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Functional breakdown */}
      <Card className="bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="text-muted-foreground size-4" aria-hidden />
            Where the money goes
          </CardTitle>
          <CardDescription>
            Core Crown expenses by function, year ended {effectiveBreakdownYear ?? '—'}
          </CardDescription>
          {breakdownCandidates.length > 0 ? (
            <CardAction>
              <select
                value={effectiveBreakdownYear ?? ''}
                onChange={(e) => setBreakdownYear(Number(e.target.value))}
                className="border-border bg-background rounded-md border px-2.5 py-1.5 text-sm"
                aria-label="Choose a year for the spending breakdown"
              >
                {breakdownCandidates
                  .slice()
                  .reverse()
                  .map((r) => (
                    <option key={r.year} value={r.year}>
                      {r.year}
                    </option>
                  ))}
              </select>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent>
          {breakdownData.length > 0 ? (
            <SpendingBreakdownChart data={breakdownData} />
          ) : (
            <p className="text-muted-foreground py-16 text-center text-sm">
              No functional breakdown available for the selected filters.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <div>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tight">
          <CalendarDays className="text-brand size-5" aria-hidden />
          Year-by-year
        </h3>
        <Card className="bg-card/60 overflow-hidden backdrop-blur-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead>Government</TableHead>
                <TableHead className="text-right">{metricMeta.short}</TableHead>
                <TableHead className="text-right">% of GDP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible
                .slice()
                .reverse()
                .map((r) => {
                  const mandate = mandateForYear(r.year);
                  const value = metricValue(r, metric);
                  const pct = spendPctGdp(r);
                  return (
                    <TableRow key={r.year}>
                      <TableCell className="font-medium tabular-nums">{r.year}</TableCell>
                      <TableCell>
                        {mandate ? (
                          <span className="flex items-center gap-2.5">
                            <span
                              className="size-3 shrink-0 rounded-full ring-1 ring-white/10"
                              style={{ backgroundColor: partyColor(mandate.party) }}
                              aria-hidden
                            />
                            <span>{mandate.pm}</span>
                            <Badge variant="secondary">{mandate.party}</Badge>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMetric(value, percent)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right tabular-nums">
                        {pct === null ? '—' : `${pct.toFixed(1)}%`}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
