'use client';

import {
  FileText,
  Filter,
  Flag,
  Landmark,
  ScanSearch,
  Search,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { type BillRankRow, BillsAnalysis } from '@/components/analytics/bills-analysis';
import {
  type AnalyticsFilters,
  Chip,
  CountBadge,
  SectionLabel,
} from '@/components/analytics/controls';
import { ElectorateAnalysis } from '@/components/analytics/electorate-analysis';
import { ExpensesAnalysis } from '@/components/analytics/expenses-analysis';
import { PartiesAnalysis, type PartyPollingRow } from '@/components/analytics/parties-analysis';
import { PoliticiansAnalysis } from '@/components/analytics/politicians-analysis';
import { ScrutinyAnalysis } from '@/components/analytics/scrutiny-analysis';
import { SpendingAnalysis } from '@/components/analytics/spending-analysis';
import { Reveal } from '@/components/reveal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { EnrichedExpense, MpProfile, VotingDiscipline } from '@/lib/analytics';
import { partyColor } from '@/lib/party';
import type { SpendingYear } from '@/types/records';

interface AnalyticsExplorerProps {
  rows: EnrichedExpense[];
  periods: string[];
  voting: VotingDiscipline;
  profiles: MpProfile[];
  polling: PartyPollingRow[];
  billRanks: BillRankRow[];
  spendingRecords: SpendingYear[];
}

const SEAT_OPTIONS: Array<{ value: AnalyticsFilters['seatType']; label: string }> = [
  { value: 'all', label: 'All seats' },
  { value: 'electorate', label: 'Electorate' },
  { value: 'list', label: 'List' },
];

/** Analytics workspace: a shared filter bar over the category analyses. */
export function AnalyticsExplorer({
  rows,
  periods,
  voting,
  profiles,
  polling,
  billRanks,
  spendingRecords,
}: AnalyticsExplorerProps) {
  const [parties, setParties] = useState<Set<string>>(() => new Set());
  const [seatType, setSeatType] = useState<AnalyticsFilters['seatType']>('all');
  const [query, setQuery] = useState('');

  const filters: AnalyticsFilters = { parties, seatType, query };

  const partyOptions = useMemo(() => {
    const mpByParty = new Map<string, Set<string>>();
    for (const r of rows) {
      const set = mpByParty.get(r.party) ?? new Set<string>();
      set.add(r.mpId);
      mpByParty.set(r.party, set);
    }
    for (const d of voting.mpDeviations) {
      const set = mpByParty.get(d.party) ?? new Set<string>();
      set.add(d.mpId);
      mpByParty.set(d.party, set);
    }
    return [...mpByParty.entries()]
      .map(([party, set]) => ({ party, count: set.size }))
      .sort((a, b) => b.count - a.count);
  }, [rows, voting]);

  const toggleParty = (party: string) =>
    setParties((prev) => {
      const next = new Set(prev);
      if (next.has(party)) next.delete(party);
      else next.add(party);
      return next;
    });

  const filtersActive = parties.size > 0 || seatType !== 'all' || query.trim() !== '';
  const clearFilters = () => {
    setParties(new Set());
    setSeatType('all');
    setQuery('');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Global filter bar */}
      <div className="border-border/50 from-card/70 to-card/30 relative overflow-hidden rounded-2xl border bg-linear-to-br p-4 backdrop-blur-md sm:p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--chart-1), transparent 70%)' }}
        />
        <div className="relative flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <SectionLabel icon={Filter}>Filters — shape every analysis</SectionLabel>
            {filtersActive ? (
              <button
                type="button"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
              >
                <X className="size-3.5" />
                Clear
              </button>
            ) : null}
          </div>

          <div className="group relative">
            <Search className="text-muted-foreground group-focus-within:text-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 transition-colors" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by MP name…"
              className="border-border/60 bg-background/70 focus-visible:border-primary/50 focus-visible:ring-primary/20 h-11 w-full rounded-xl border pr-10 pl-10 text-sm outline-none transition focus-visible:ring-4"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              Parties
            </span>
            <div className="flex flex-wrap gap-1.5">
              <Chip active={parties.size === 0} onClick={() => setParties(new Set())}>
                <Users className="size-3.5" />
                All
              </Chip>
              {partyOptions.map(({ party, count }) => (
                <Chip key={party} active={parties.has(party)} onClick={() => toggleParty(party)}>
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: partyColor(party) }}
                    aria-hidden
                  />
                  {party}
                  <CountBadge>{count}</CountBadge>
                </Chip>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              Seat type <span className="normal-case">(money, politicians & scrutiny)</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SEAT_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  active={seatType === option.value}
                  onClick={() => setSeatType(option.value)}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Category analyses */}
      <Tabs defaultValue="money" className="gap-6">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="money">
            <Wallet className="size-4" />
            Money
          </TabsTrigger>
          <TabsTrigger value="politicians">
            <Users className="size-4" />
            Politicians
          </TabsTrigger>
          <TabsTrigger value="parties">
            <Flag className="size-4" />
            Parties
          </TabsTrigger>
          <TabsTrigger value="bills">
            <FileText className="size-4" />
            Bills
          </TabsTrigger>
          <TabsTrigger value="spending">
            <Landmark className="size-4" />
            Spending
          </TabsTrigger>
          <TabsTrigger value="scrutiny">
            <ScanSearch className="size-4" />
            Under scrutiny
          </TabsTrigger>
        </TabsList>

        <TabsContent value="money">
          <Reveal>
            <div className="flex flex-col gap-10">
              <ExpensesAnalysis rows={rows} periods={periods} filters={filters} />
              <div className="flex flex-col gap-6 border-t pt-8">
                <h3 className="text-lg font-semibold tracking-tight">Electorate vs list travel</h3>
                <ElectorateAnalysis rows={rows} filters={filters} />
              </div>
            </div>
          </Reveal>
        </TabsContent>
        <TabsContent value="politicians">
          <Reveal>
            <PoliticiansAnalysis profiles={profiles} filters={filters} />
          </Reveal>
        </TabsContent>
        <TabsContent value="parties">
          <Reveal>
            <PartiesAnalysis rows={rows} voting={voting} polling={polling} filters={filters} />
          </Reveal>
        </TabsContent>
        <TabsContent value="bills">
          <Reveal>
            <BillsAnalysis billRanks={billRanks} cohesion={voting.billCohesion} />
          </Reveal>
        </TabsContent>
        <TabsContent value="spending">
          <Reveal>
            <SpendingAnalysis records={spendingRecords} />
          </Reveal>
        </TabsContent>
        <TabsContent value="scrutiny">
          <Reveal>
            <ScrutinyAnalysis rows={rows} filters={filters} />
          </Reveal>
        </TabsContent>
      </Tabs>
    </div>
  );
}
