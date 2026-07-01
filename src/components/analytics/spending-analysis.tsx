'use client';

import { BarChart3, Gauge, Landmark } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Chip, SectionLabel } from '@/components/analytics/controls';
import { RankingList } from '@/components/ranking-list';
import {
  type SpendingBar,
  SpendingBarChart,
  SpendingBreakdownChart,
} from '@/components/spending-charts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { YearRangePicker, type YearRangePreset } from '@/components/year-range-picker';
import { partyColor } from '@/lib/party';
import { mandateForYear, metricValue, SPENDING_METRICS, type SpendingMetric } from '@/lib/spending';
import { formatMillionsNZD } from '@/lib/utils';
import type { SpendingYear } from '@/types/records';

interface SpendingAnalysisProps {
  records: SpendingYear[];
}

/** Macro Crown-spending context: metric, year range and by-government averages. */
export function SpendingAnalysis({ records }: SpendingAnalysisProps) {
  const years = records.map((r) => r.year);
  const dataMin = Math.min(...years);
  const dataMax = Math.max(...years);

  const [metric, setMetric] = useState<SpendingMetric>('core');
  const [from, setFrom] = useState(Math.max(dataMin, dataMax - 29));
  const [to, setTo] = useState(dataMax);

  const metricMeta = SPENDING_METRICS.find((m) => m.id === metric) ?? SPENDING_METRICS[0];
  const percent = metricMeta.percent;

  const lo = Math.min(from, to);
  const hi = Math.max(from, to);

  const rangePresets: YearRangePreset[] = [
    { label: 'All years', from: dataMin, to: dataMax },
    { label: '21st century', from: Math.max(dataMin, 2000), to: dataMax },
    { label: 'Last 30 years', from: Math.max(dataMin, dataMax - 29), to: dataMax },
    { label: 'Last 10 years', from: Math.max(dataMin, dataMax - 9), to: dataMax },
  ];

  const analysis = useMemo(() => {
    const visible = records.filter((r) => r.year >= lo && r.year <= hi);

    const bars: SpendingBar[] = visible
      .map((r) => {
        const mandate = mandateForYear(r.year);
        return {
          year: r.year,
          value: metricValue(r, metric),
          color: partyColor(mandate?.party),
          pm: mandate ? `${mandate.pm} · ${mandate.party}` : 'Government unknown',
          party: mandate?.party ?? '',
        };
      })
      .filter((b) => b.value !== null);

    const byParty = new Map<string, { sum: number; count: number }>();
    for (const b of bars) {
      if (!b.party || b.value === null) continue;
      const agg = byParty.get(b.party) ?? { sum: 0, count: 0 };
      agg.sum += b.value;
      agg.count += 1;
      byParty.set(b.party, agg);
    }
    const govtAverages = [...byParty.entries()]
      .map(([party, agg]) => ({
        label: party,
        value: agg.sum / agg.count,
        accent: partyColor(party),
        sublabel: `${agg.count} yrs`,
      }))
      .sort((a, b) => b.value - a.value);

    const breakdownRecord = [...visible].reverse().find((r) => r.categories.length > 0) ?? null;
    const breakdownData = (breakdownRecord?.categories ?? [])
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    return { bars, govtAverages, breakdownRecord, breakdownData };
  }, [records, lo, hi, metric]);

  const formatMetric = (value: number) =>
    percent ? `${value.toFixed(1)}%` : formatMillionsNZD(value);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground max-w-3xl text-sm">
        Macro context from the Treasury Fiscal Time Series: how Crown spending has moved over time,
        coloured by the government in office. Use it to frame the MP-level figures against the whole
        of government.
      </p>

      <div className="border-border/50 bg-card/40 flex flex-col gap-5 rounded-2xl border p-4 backdrop-blur-sm sm:p-5">
        <div className="flex flex-col gap-3">
          <SectionLabel icon={Gauge}>Measure</SectionLabel>
          <div
            className="flex flex-wrap gap-1.5"
            role="tablist"
            aria-label="Choose a spending metric"
          >
            {SPENDING_METRICS.map((m) => (
              <Chip key={m.id} active={m.id === metric} onClick={() => setMetric(m.id)}>
                <BarChart3 className="size-3.5" aria-hidden />
                {m.label}
              </Chip>
            ))}
          </div>
          <p className="text-muted-foreground text-sm">{metricMeta.description}</p>
        </div>
        <div className="flex flex-col gap-3">
          <SectionLabel icon={Landmark}>Period</SectionLabel>
          <YearRangePicker
            min={dataMin}
            max={dataMax}
            from={from}
            to={to}
            onChange={([nextFrom, nextTo]) => {
              setFrom(nextFrom);
              setTo(nextTo);
            }}
            presets={rangePresets}
          />
        </div>
      </div>

      <Card className="bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>{metricMeta.label} by fiscal year</CardTitle>
          <CardDescription>
            {lo}–{hi}, coloured by the government in office.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SpendingBarChart data={analysis.bars} percent={percent} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Average by government</CardTitle>
            <CardDescription>
              Mean {metricMeta.label.toLowerCase()} per party in office.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analysis.govtAverages.length > 0 ? (
              <RankingList items={analysis.govtAverages} formatValue={formatMetric} />
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">No data in range.</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Where the money goes</CardTitle>
            <CardDescription>
              Core Crown spend by function
              {analysis.breakdownRecord ? ` · ${analysis.breakdownRecord.year}` : ''}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analysis.breakdownData.length > 0 ? (
              <SpendingBreakdownChart data={analysis.breakdownData} />
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No functional breakdown in range.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
