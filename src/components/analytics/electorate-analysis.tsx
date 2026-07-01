'use client';

import { MapPin, Plane, Ratio, Users } from 'lucide-react';
import { useMemo } from 'react';
import { type AnalyticsFilters, matchesMp } from '@/components/analytics/controls';
import { SeatTypeChart, type SeatTypeRow } from '@/components/analytics-charts';
import { RankingList } from '@/components/ranking-list';
import { StatCard } from '@/components/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { EnrichedExpense, SeatType } from '@/lib/analytics';
import { partyColor } from '@/lib/party';
import { formatNZD, formatNZDCompact } from '@/lib/utils';

const CATEGORIES = ['travel', 'accommodation', 'other'] as const;

interface ElectorateAnalysisProps {
  rows: EnrichedExpense[];
  filters: AnalyticsFilters;
}

/**
 * Electorate vs list comparison. Electorate MPs represent a geographic seat
 * (often far from Wellington), so their travel/accommodation costs are expected
 * to differ from list MPs — a useful proxy for distance-driven spending. This
 * section deliberately ignores the global seat-type filter so both groups show.
 */
export function ElectorateAnalysis({ rows, filters }: ElectorateAnalysisProps) {
  const analysis = useMemo(() => {
    const seats: Record<SeatType, { mps: Set<string>; byCategory: Map<string, number> }> = {
      electorate: { mps: new Set(), byCategory: new Map() },
      list: { mps: new Set(), byCategory: new Map() },
    };
    const electorateTravel = new Map<string, { name: string; party: string; total: number }>();

    for (const r of rows) {
      if (!matchesMp(filters, r.party, r.name)) continue;
      const seat = seats[r.seatType];
      seat.mps.add(r.mpId);
      seat.byCategory.set(r.category, (seat.byCategory.get(r.category) ?? 0) + r.amount);

      if (r.seatType === 'electorate' && r.category === 'travel') {
        const cur = electorateTravel.get(r.mpId) ?? { name: r.name, party: r.party, total: 0 };
        cur.total += r.amount;
        electorateTravel.set(r.mpId, cur);
      }
    }

    const avg = (seat: SeatType, category: string): number => {
      const count = seats[seat].mps.size;
      if (count === 0) return 0;
      return (seats[seat].byCategory.get(category) ?? 0) / count;
    };

    const chartData: SeatTypeRow[] = CATEGORIES.map((category) => ({
      category,
      electorate: avg('electorate', category),
      list: avg('list', category),
    }));

    const topTravel = [...electorateTravel.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([mpId, m]) => ({
        label: m.name,
        value: m.total,
        accent: partyColor(m.party),
        href: `/politicians/${mpId}`,
        sublabel: m.party,
      }));

    const electorateTravelAvg = avg('electorate', 'travel');
    const listTravelAvg = avg('list', 'travel');

    return {
      chartData,
      topTravel,
      electorateMps: seats.electorate.mps.size,
      listMps: seats.list.mps.size,
      electorateTravelAvg,
      listTravelAvg,
      ratio: listTravelAvg > 0 ? electorateTravelAvg / listTravelAvg : null,
    };
  }, [rows, filters]);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground max-w-3xl text-sm">
        Electorate MPs serve a geographic seat and travel to and from Wellington; list MPs are
        elected off the party list. Comparing their average travel and accommodation costs is a
        rough proxy for how distance drives spending — read it as context, not a judgement.
      </p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Avg travel · electorate"
          value={formatNZDCompact(analysis.electorateTravelAvg)}
          hint={`${analysis.electorateMps} electorate MPs`}
          icon={Plane}
          accent="var(--chart-1)"
        />
        <StatCard
          label="Avg travel · list"
          value={formatNZDCompact(analysis.listTravelAvg)}
          hint={`${analysis.listMps} list MPs`}
          icon={MapPin}
          accent="var(--chart-2)"
        />
        <StatCard
          label="Electorate ÷ list"
          value={analysis.ratio !== null ? `${analysis.ratio.toFixed(2)}×` : '—'}
          hint="Travel-cost ratio"
          icon={Ratio}
          accent="var(--chart-3)"
        />
        <StatCard
          label="MPs compared"
          value={analysis.electorateMps + analysis.listMps}
          hint="Electorate + list"
          icon={Users}
          accent="var(--chart-4)"
        />
      </div>

      {analysis.electorateMps + analysis.listMps === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          No expenses match the current filters.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Average per MP by seat type</CardTitle>
              <CardDescription>Mean spend per MP in each category.</CardDescription>
            </CardHeader>
            <CardContent>
              <SeatTypeChart data={analysis.chartData} />
            </CardContent>
          </Card>
          <Card className="bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Top electorate travellers</CardTitle>
              <CardDescription>Highest total travel spend among electorate MPs.</CardDescription>
            </CardHeader>
            <CardContent>
              {analysis.topTravel.length > 0 ? (
                <RankingList items={analysis.topTravel} formatValue={formatNZD} />
              ) : (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  No electorate travel in view.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
