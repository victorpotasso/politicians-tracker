'use client';

import { BarChart3, CalendarDays, CalendarRange, Landmark, LineChart, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { PollTrendChart, SeatProjectionChart } from '@/components/poll-charts';
import { StatCard } from '@/components/stat-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ElectionSummary } from '@/lib/data';
import { cn, formatDayMonthYear, groupThousands } from '@/lib/utils';

/** Seats needed for a majority in the 120-seat House. */
const MAJORITY = 61;

interface PollsExplorerProps {
  summaries: ElectionSummary[];
}

/** Interactive per-cycle poll explorer: pick an election and drill into it. */
export function PollsExplorer({ summaries }: PollsExplorerProps) {
  const [selected, setSelected] = useState(summaries[0]?.election ?? '');
  const summary = summaries.find((s) => s.election === selected) ?? summaries[0];
  if (!summary) return null;

  const projection = summary.average
    .filter((row) => row.projectedSeats > 0)
    .map((row) => ({ party: row.party, percentage: row.percentage, seats: row.projectedSeats }));
  const leadingParties = summary.average.slice(0, 5);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Select an election cycle">
        {summaries.map((s) => {
          const active = s.election === summary.election;
          return (
            <button
              key={s.election}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelected(s.election)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                active
                  ? 'border-transparent bg-foreground text-background'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              <CalendarRange className="size-3.5" aria-hidden />
              {s.election}
              {s.isCurrent ? <span className="ml-1.5 text-xs opacity-70">· upcoming</span> : null}
            </button>
          );
        })}
      </div>

      <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Polls"
          value={summary.totalPolls}
          hint={`${formatDayMonthYear(summary.dateRange.from)} – ${formatDayMonthYear(summary.dateRange.to)}`}
          icon={BarChart3}
          accent="var(--chart-2)"
        />
        <StatCard
          label="Pollsters"
          value={summary.pollsters}
          hint="Distinct organisations"
          icon={Users}
          accent="var(--chart-3)"
        />
        <StatCard
          label="Final lead"
          value={summary.leadPct !== null ? `${summary.leadPct}%` : '—'}
          hint={summary.leadParty ?? undefined}
          icon={LineChart}
          accent="var(--chart-4)"
        />
        <StatCard
          label="Last poll"
          value={summary.latestPollster ?? '—'}
          hint={formatDayMonthYear(summary.latestDate)}
          icon={CalendarDays}
          accent="var(--chart-1)"
        />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="bg-card/60 backdrop-blur-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="text-muted-foreground size-4" aria-hidden />
              {summary.election} party-vote trend
            </CardTitle>
            <CardDescription>Support for each major party through the campaign</CardDescription>
          </CardHeader>
          <CardContent>
            <PollTrendChart data={summary.trend} parties={summary.trendParties} />
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="text-muted-foreground size-4" aria-hidden />
              Projected seats
            </CardTitle>
            <CardDescription>
              Sainte-Laguë from the poll of polls · {summary.projectedTotalSeats} of 120 · majority
              at {MAJORITY}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projection.length > 0 ? (
              <SeatProjectionChart data={projection} />
            ) : (
              <p className="text-muted-foreground py-12 text-center text-sm">
                No party cleared the 5% threshold in the averaged polls.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-8">
        <h3 className="mb-1 flex items-center gap-2 text-lg font-semibold tracking-tight">
          <BarChart3 className="text-brand size-5" aria-hidden />
          Poll of polls
        </h3>
        <p className="text-muted-foreground mb-4 text-sm">
          {`Average of the ${summary.election} cycle's final polls${
            summary.isCurrent ? ', with each party linked to its profile and leader' : ''
          }`}
        </p>
        <Card className="bg-card/60 overflow-hidden backdrop-blur-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Party</TableHead>
                {summary.isCurrent ? <TableHead>Leader</TableHead> : null}
                <TableHead className="text-right">Average</TableHead>
                <TableHead className="text-right">Projected</TableHead>
                {summary.isCurrent ? <TableHead className="text-right">Current</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.average.map((row) => {
                const delta = row.projectedSeats - row.currentSeats;
                return (
                  <TableRow key={row.party}>
                    <TableCell>
                      <Link
                        href={`/parties/${row.slug}`}
                        className="flex items-center gap-2.5 font-medium hover:underline"
                      >
                        <span
                          className="size-3 shrink-0 rounded-full ring-1 ring-white/10"
                          style={{ backgroundColor: row.color }}
                          aria-hidden
                        />
                        {row.party}
                      </Link>
                    </TableCell>
                    {summary.isCurrent ? (
                      <TableCell>
                        {row.leader ? (
                          <Link
                            href={`/politicians/${row.leader.mpId}`}
                            className="text-muted-foreground hover:text-foreground hover:underline"
                          >
                            {row.leader.name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    ) : null}
                    <TableCell className="text-right font-medium tabular-nums">
                      {row.percentage}%
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.projectedSeats > 0 ? (
                        <span className="inline-flex items-center gap-1.5">
                          {row.projectedSeats}
                          {summary.isCurrent && delta !== 0 ? (
                            <Badge
                              variant="secondary"
                              className={delta > 0 ? 'text-emerald-500' : 'text-rose-500'}
                            >
                              {delta > 0 ? `+${delta}` : delta}
                            </Badge>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">below 5%</span>
                      )}
                    </TableCell>
                    {summary.isCurrent ? (
                      <TableCell className="text-muted-foreground text-right tabular-nums">
                        {row.currentSeats || '—'}
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </section>

      <section className="mt-8">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tight">
          <CalendarDays className="text-brand size-5" aria-hidden />
          Recent {summary.election} polls
        </h3>
        <Card className="bg-card/60 overflow-hidden backdrop-blur-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fieldwork</TableHead>
                <TableHead>Pollster</TableHead>
                <TableHead className="text-right">Sample</TableHead>
                {leadingParties.map((row) => (
                  <TableHead key={row.party} className="text-right">
                    {row.code}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.recent.map((poll) => {
                const byParty = new Map(poll.results.map((r) => [r.party, r.percentage]));
                return (
                  <TableRow key={poll.pollId}>
                    <TableCell className="text-muted-foreground">
                      {formatDayMonthYear(poll.endDate)}
                    </TableCell>
                    <TableCell className="font-medium">{poll.pollster}</TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {poll.sampleSize ? groupThousands(poll.sampleSize) : '—'}
                    </TableCell>
                    {leadingParties.map((row) => {
                      const value = byParty.get(row.party);
                      return (
                        <TableCell key={row.party} className="text-right tabular-nums">
                          {typeof value === 'number' ? `${value}%` : '—'}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </section>
    </div>
  );
}
