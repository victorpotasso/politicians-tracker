'use client';

import { Flag, LineChart, ShieldCheck, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import type { AnalyticsFilters } from '@/components/analytics/controls';
import { DisciplineChart, type DisciplineRow } from '@/components/analytics-charts';
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
import { type EnrichedExpense, partyDiscipline, type VotingDiscipline } from '@/lib/analytics';
import { partyColor } from '@/lib/party';
import { formatNZD } from '@/lib/utils';

/** Polling + seats context for one party, computed server-side. */
export interface PartyPollingRow {
  party: string;
  mpCount: number;
  currentSeats: number;
  pollPct: number | null;
  projectedSeats: number | null;
}

const formatPct = (value: number) => `${(value * 100).toFixed(0)}%`;

interface PartiesAnalysisProps {
  rows: EnrichedExpense[];
  voting: VotingDiscipline;
  polling: PartyPollingRow[];
  filters: AnalyticsFilters;
}

/** Party-level cross view: spend per MP, discipline, and seats vs 2026 polling. */
export function PartiesAnalysis({ rows, voting, polling, filters }: PartiesAnalysisProps) {
  const analysis = useMemo(() => {
    const allow = (party: string) => filters.parties.size === 0 || filters.parties.has(party);

    const spend = new Map<string, { total: number; mps: Set<string> }>();
    for (const r of rows) {
      if (!allow(r.party)) continue;
      const agg = spend.get(r.party) ?? { total: 0, mps: new Set<string>() };
      agg.total += r.amount;
      agg.mps.add(r.mpId);
      spend.set(r.party, agg);
    }
    const spendPerMp = [...spend.entries()]
      .map(([party, agg]) => ({
        label: party,
        value: agg.mps.size > 0 ? agg.total / agg.mps.size : 0,
        accent: partyColor(party),
        sublabel: `${agg.mps.size} MPs`,
      }))
      .sort((a, b) => b.value - a.value);

    const discipline = partyDiscipline(voting.mpDeviations.filter((d) => allow(d.party)));
    const disciplineRows: DisciplineRow[] = discipline.map((p) => ({
      label: p.party,
      rate: p.deviationRate,
      color: partyColor(p.party),
    }));

    const seatRows = polling
      .filter((p) => allow(p.party))
      .map((p) => ({
        ...p,
        change:
          p.projectedSeats !== null && p.currentSeats > 0
            ? p.projectedSeats - p.currentSeats
            : null,
      }))
      .sort(
        (a, b) =>
          (b.projectedSeats ?? -1) - (a.projectedSeats ?? -1) || b.currentSeats - a.currentSeats,
      );

    const topPoll = [...seatRows]
      .filter((p) => p.pollPct !== null)
      .sort((a, b) => (b.pollPct ?? 0) - (a.pollPct ?? 0))[0];
    const mostDisciplined = [...discipline].sort((a, b) => a.deviationRate - b.deviationRate)[0];
    const biggestMover = [...seatRows]
      .filter((p) => p.change !== null)
      .sort((a, b) => Math.abs(b.change ?? 0) - Math.abs(a.change ?? 0))[0];

    return {
      spendPerMp,
      disciplineRows,
      seatRows,
      partyCount: seatRows.length,
      topPoll,
      mostDisciplined,
      biggestMover,
    };
  }, [rows, voting, polling, filters]);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground max-w-3xl text-sm">
        How the parties compare on the money they spend per MP, how tightly they vote together, and
        where the 2026 poll-of-polls projects their seats against what they hold today.
      </p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Parties"
          value={analysis.partyCount}
          hint="In view"
          icon={Flag}
          accent="var(--chart-2)"
        />
        <StatCard
          label="Poll leader"
          value={analysis.topPoll?.party ?? '—'}
          hint={analysis.topPoll?.pollPct !== null ? `${analysis.topPoll?.pollPct}%` : undefined}
          icon={LineChart}
          accent="var(--chart-1)"
        />
        <StatCard
          label="Most disciplined"
          value={analysis.mostDisciplined?.party ?? '—'}
          hint={
            analysis.mostDisciplined
              ? `${formatPct(analysis.mostDisciplined.deviationRate)} break rate`
              : undefined
          }
          icon={ShieldCheck}
          accent="var(--chart-3)"
        />
        <StatCard
          label="Biggest projected move"
          value={
            analysis.biggestMover?.change != null
              ? `${analysis.biggestMover.change > 0 ? '+' : ''}${analysis.biggestMover.change}`
              : '—'
          }
          hint={analysis.biggestMover?.party}
          icon={TrendingUp}
          accent="var(--chart-4)"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Spend per MP</CardTitle>
            <CardDescription>Total disclosed spend divided by tracked MPs.</CardDescription>
          </CardHeader>
          <CardContent>
            {analysis.spendPerMp.length > 0 ? (
              <RankingList items={analysis.spendPerMp} formatValue={formatNZD} />
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">No spend in view.</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Party discipline</CardTitle>
            <CardDescription>Break rate by party — lower is more cohesive.</CardDescription>
          </CardHeader>
          <CardContent>
            {analysis.disciplineRows.length > 0 ? (
              <DisciplineChart data={analysis.disciplineRows} />
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">No voting data.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Seats vs the 2026 polls</CardTitle>
          <CardDescription>
            Current seats against seats projected from the poll-of-polls (Sainte-Laguë, 5%
            threshold, 120-seat House — indicative).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Party</TableHead>
                <TableHead className="text-right">MPs tracked</TableHead>
                <TableHead className="text-right">Current seats</TableHead>
                <TableHead className="text-right">Poll %</TableHead>
                <TableHead className="text-right">Projected 2026</TableHead>
                <TableHead className="text-right">Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analysis.seatRows.map((p) => (
                <TableRow key={p.party}>
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: partyColor(p.party) }}
                        aria-hidden
                      />
                      {p.party}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{p.mpCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.currentSeats || '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.pollPct !== null ? `${p.pollPct}%` : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.projectedSeats !== null ? p.projectedSeats : '—'}
                  </TableCell>
                  <TableCell
                    className="text-right font-medium tabular-nums"
                    style={
                      p.change != null && p.change !== 0
                        ? { color: p.change > 0 ? 'var(--chart-1)' : 'var(--chart-2)' }
                        : undefined
                    }
                  >
                    {p.change != null ? `${p.change > 0 ? '+' : ''}${p.change}` : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
