'use client';

import { Percent, Users, Vote, Wallet } from 'lucide-react';
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
import type { MpProfile } from '@/lib/analytics';
import { partyColor } from '@/lib/party';
import { formatNZD, formatNZDCompact } from '@/lib/utils';

const formatPct = (value: number) => `${(value * 100).toFixed(0)}%`;

interface PoliticiansAnalysisProps {
  profiles: MpProfile[];
  filters: AnalyticsFilters;
}

/** Per-MP cross view: money and voting independence side by side. */
export function PoliticiansAnalysis({ profiles, filters }: PoliticiansAnalysisProps) {
  const analysis = useMemo(() => {
    const filtered = profiles.filter(
      (p) =>
        matchesMp(filters, p.party, p.name) &&
        (filters.seatType === 'all' || p.seatType === filters.seatType),
    );

    const spenders = [...filtered].filter((p) => p.total > 0).sort((a, b) => b.total - a.total);
    const independents = [...filtered]
      .filter((p) => p.votesConsidered >= 3)
      .sort((a, b) => b.deviationRate - a.deviationRate);

    const totalSpend = filtered.reduce((sum, p) => sum + p.total, 0);
    const withVotes = filtered.filter((p) => p.votesConsidered > 0).length;

    return {
      count: filtered.length,
      totalSpend,
      withVotes,
      topSpenders: spenders.slice(0, 12).map((p) => ({
        label: p.name,
        value: p.total,
        accent: partyColor(p.party),
        href: `/politicians/${p.mpId}`,
        sublabel: p.party,
      })),
      topIndependents: independents.slice(0, 12).map((p) => ({
        label: p.name,
        value: p.deviationRate,
        accent: partyColor(p.party),
        href: `/politicians/${p.mpId}`,
        sublabel: `${p.party} · ${p.votesConsidered} votes`,
      })),
      table: spenders.slice(0, 25),
    };
  }, [profiles, filters]);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground max-w-3xl text-sm">
        Every MP, with their disclosed spending and how often they broke from their party lined up
        together — a quick way to spot who is both a big spender and a maverick voter.
      </p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="MPs in view"
          value={analysis.count}
          hint="Match the filters"
          icon={Users}
          accent="var(--chart-2)"
        />
        <StatCard
          label="Total spend"
          value={formatNZDCompact(analysis.totalSpend)}
          hint="Across these MPs"
          icon={Wallet}
          accent="var(--chart-1)"
        />
        <StatCard
          label="With voting record"
          value={analysis.withVotes}
          hint="Comparable divisions"
          icon={Vote}
          accent="var(--chart-4)"
        />
        <StatCard
          label="Most independent"
          value={analysis.topIndependents[0] ? formatPct(analysis.topIndependents[0].value) : '—'}
          hint={analysis.topIndependents[0]?.label}
          icon={Percent}
          accent="var(--chart-3)"
        />
      </div>

      {analysis.count === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          No MPs match the current filters.
        </p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Biggest spenders</CardTitle>
                <CardDescription>Highest disclosed spend among these MPs.</CardDescription>
              </CardHeader>
              <CardContent>
                <RankingList items={analysis.topSpenders} formatValue={formatNZD} />
              </CardContent>
            </Card>
            <Card className="bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Most independent voters</CardTitle>
                <CardDescription>Highest share of votes against their own party.</CardDescription>
              </CardHeader>
              <CardContent>
                {analysis.topIndependents.length > 0 ? (
                  <RankingList items={analysis.topIndependents} formatValue={formatPct} />
                ) : (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    No comparable voting records in view.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>MP scorecard</CardTitle>
              <CardDescription>Top 25 by spend — money and voting side by side.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MP</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Seat</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                    <TableHead className="text-right">Votes</TableHead>
                    <TableHead className="text-right">Broke line</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis.table.map((p) => (
                    <TableRow key={p.mpId}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: partyColor(p.party) }}
                            aria-hidden
                          />
                          {p.party}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground capitalize">
                        {p.seatType}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatNZD(p.total)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.votesConsidered || '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.votesConsidered ? formatPct(p.deviationRate) : '—'}
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
