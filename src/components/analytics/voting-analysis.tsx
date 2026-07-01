'use client';

import { AlertTriangle, GitBranch, Percent, ShieldCheck, Vote } from 'lucide-react';
import { useMemo } from 'react';
import { type AnalyticsFilters, matchesMp } from '@/components/analytics/controls';
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
import { partyDiscipline, type VotingDiscipline } from '@/lib/analytics';
import { partyColor } from '@/lib/party';

const formatPct = (value: number) => `${(value * 100).toFixed(0)}%`;

interface VotingAnalysisProps {
  voting: VotingDiscipline;
  filters: AnalyticsFilters;
}

/**
 * Party-line voting discipline, derived from recorded divisions. `partyVote`
 * isn't published in the source, so each party's position on a division is
 * inferred from the majority of its members — hence the coverage caveat.
 */
export function VotingAnalysis({ voting, filters }: VotingAnalysisProps) {
  const analysis = useMemo(() => {
    const filtered = voting.mpDeviations.filter((d) => matchesMp(filters, d.party, d.name));

    const parties = partyDiscipline(filtered);
    const mostIndependent = filtered.slice(0, 15).map((d) => ({
      label: d.name,
      value: d.deviationRate,
      accent: partyColor(d.party),
      href: `/politicians/${d.mpId}`,
      sublabel: `${d.party} · ${d.votesConsidered} votes`,
    }));

    const disciplineRows: DisciplineRow[] = parties.map((p) => ({
      label: p.party,
      rate: p.deviationRate,
      color: partyColor(p.party),
    }));

    const totalConsidered = filtered.reduce((sum, d) => sum + d.votesConsidered, 0);
    const totalDeviations = filtered.reduce((sum, d) => sum + d.deviations, 0);
    const avgRate = totalConsidered > 0 ? totalDeviations / totalConsidered : 0;
    const mostCohesive = [...parties].sort((a, b) => a.deviationRate - b.deviationRate)[0] ?? null;

    return {
      mpCount: filtered.length,
      mostIndependent,
      disciplineRows,
      avgRate,
      mostCohesive,
    };
  }, [voting, filters]);

  return (
    <div className="flex flex-col gap-6">
      <div className="border-border/60 bg-amber-500/5 text-muted-foreground flex items-start gap-3 rounded-xl border border-dashed p-4 text-sm">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
        <p>
          Coverage is partial: recorded divisions cover{' '}
          <span className="text-foreground font-medium">{voting.coverage.mps}</span> MPs across{' '}
          <span className="text-foreground font-medium">{voting.coverage.divisions}</span> divisions
          on <span className="text-foreground font-medium">{voting.coverage.bills}</span> bills.
          Party positions are inferred from each party&rsquo;s voting majority, so treat
          &ldquo;broke party line&rdquo; as indicative rather than official.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="MPs analysed"
          value={analysis.mpCount}
          hint="With comparable votes"
          icon={Vote}
          accent="var(--chart-1)"
        />
        <StatCard
          label="Divisions"
          value={voting.coverage.divisions}
          hint="Recorded party votes"
          icon={GitBranch}
          accent="var(--chart-2)"
        />
        <StatCard
          label="Avg break rate"
          value={formatPct(analysis.avgRate)}
          hint="Votes against own party"
          icon={Percent}
          accent="var(--chart-4)"
        />
        <StatCard
          label="Most disciplined"
          value={analysis.mostCohesive?.party ?? '—'}
          hint={
            analysis.mostCohesive
              ? `${formatPct(analysis.mostCohesive.deviationRate)} break rate`
              : undefined
          }
          icon={ShieldCheck}
          accent="var(--chart-3)"
        />
      </div>

      {analysis.mpCount === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          No MPs with recorded votes match the current filters.
        </p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Most independent MPs</CardTitle>
                <CardDescription>Highest share of votes cast against their party.</CardDescription>
              </CardHeader>
              <CardContent>
                <RankingList items={analysis.mostIndependent} formatValue={formatPct} />
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
                  <p className="text-muted-foreground py-8 text-center text-sm">No party data.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Most contested bills</CardTitle>
              <CardDescription>
                Cross-party cohesion per bill (dataset-wide). Lower cohesion means members split
                more against their parties.
              </CardDescription>
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
                  {voting.billCohesion.map((bill) => (
                    <TableRow key={bill.billId}>
                      <TableCell className="max-w-md truncate font-medium">{bill.issue}</TableCell>
                      <TableCell className="text-right tabular-nums">{bill.divisions}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPct(bill.cohesion)}
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
