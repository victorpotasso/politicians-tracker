'use client';

import { FileText, GitBranch, Scale, Vote } from 'lucide-react';
import { useMemo } from 'react';

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
import type { BillCohesion } from '@/lib/analytics';

/** Division count per bill, computed server-side. */
export interface BillRankRow {
  billId: string;
  title: string;
  divisions: number;
}

const formatPct = (value: number) => `${(value * 100).toFixed(0)}%`;

interface BillsAnalysisProps {
  billRanks: BillRankRow[];
  cohesion: BillCohesion[];
}

/** Which bills split Parliament — by division count and party cohesion. */
export function BillsAnalysis({ billRanks, cohesion }: BillsAnalysisProps) {
  const analysis = useMemo(() => {
    const cohesionById = new Map(cohesion.map((c) => [c.billId, c]));
    const withVotes = billRanks.filter((b) => b.divisions > 0);

    const rows = withVotes
      .map((b) => ({
        billId: b.billId,
        title: b.title,
        divisions: b.divisions,
        cohesion: cohesionById.get(b.billId)?.cohesion ?? null,
      }))
      .sort((a, b) => b.divisions - a.divisions);

    const totalDivisions = withVotes.reduce((sum, b) => sum + b.divisions, 0);
    const cohesionValues = cohesion.map((c) => c.cohesion);
    const avgCohesion =
      cohesionValues.length > 0
        ? cohesionValues.reduce((sum, v) => sum + v, 0) / cohesionValues.length
        : null;

    const mostContested = rows.slice(0, 8).map((b) => ({
      label: b.title,
      value: b.divisions,
      accent: 'var(--chart-1)',
      href: `/bills/${b.billId}`,
    }));

    const mostSplit = [...cohesion]
      .sort((a, b) => a.cohesion - b.cohesion)
      .slice(0, 8)
      .map((c) => ({
        label: c.issue,
        value: 1 - c.cohesion,
        accent: 'var(--chart-4)',
        href: `/bills/${c.billId}`,
        sublabel: `${c.divisions} divisions`,
      }));

    return {
      rows,
      totalDivisions,
      avgCohesion,
      billCount: withVotes.length,
      mostContested,
      mostSplit,
      topBill: rows[0] ?? null,
    };
  }, [billRanks, cohesion]);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground max-w-3xl text-sm">
        Bills ranked by how hard they were fought — the number of recorded divisions, and how much
        members split against their own parties. Lower cohesion means a more genuine conscience
        vote.
      </p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Bills with votes"
          value={analysis.billCount}
          hint="Recorded divisions"
          icon={FileText}
          accent="var(--chart-2)"
        />
        <StatCard
          label="Total divisions"
          value={analysis.totalDivisions}
          hint="Across all bills"
          icon={GitBranch}
          accent="var(--chart-1)"
        />
        <StatCard
          label="Most contested"
          value={analysis.topBill?.divisions ?? '—'}
          hint={analysis.topBill?.title}
          icon={Vote}
          accent="var(--chart-4)"
        />
        <StatCard
          label="Average cohesion"
          value={analysis.avgCohesion !== null ? formatPct(analysis.avgCohesion) : '—'}
          hint="Votes with own party"
          icon={Scale}
          accent="var(--chart-3)"
        />
      </div>

      {analysis.billCount === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          No bills with recorded divisions.
        </p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Most contested</CardTitle>
                <CardDescription>Ranked by number of recorded divisions.</CardDescription>
              </CardHeader>
              <CardContent>
                <RankingList items={analysis.mostContested} />
              </CardContent>
            </Card>
            <Card className="bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Most divided</CardTitle>
                <CardDescription>Share of votes cast against party lines.</CardDescription>
              </CardHeader>
              <CardContent>
                {analysis.mostSplit.length > 0 ? (
                  <RankingList items={analysis.mostSplit} formatValue={formatPct} />
                ) : (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    No cohesion data.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>All bills</CardTitle>
              <CardDescription>Divisions and party cohesion per bill.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill</TableHead>
                    <TableHead className="text-right">Divisions</TableHead>
                    <TableHead className="text-right">Cohesion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis.rows.map((b) => (
                    <TableRow key={b.billId}>
                      <TableCell className="max-w-md truncate font-medium">{b.title}</TableCell>
                      <TableCell className="text-right tabular-nums">{b.divisions}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {b.cohesion !== null ? formatPct(b.cohesion) : '—'}
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
