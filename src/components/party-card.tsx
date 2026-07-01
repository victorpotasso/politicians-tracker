import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { PartySummary } from '@/lib/data';

export function PartyCard({ party }: { party: PartySummary }) {
  return (
    <Link href={`/parties/${party.slug}`} className="group rounded-xl focus-visible:outline-none">
      <Card className="interactive-card bg-card/60 relative overflow-hidden py-5 backdrop-blur-sm">
        {/* Party colour spine */}
        <span
          className="absolute inset-y-0 left-0 w-1.5"
          style={{ backgroundColor: party.color }}
          aria-hidden
        />
        <CardContent className="flex flex-col gap-4 pl-7">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold tracking-tight">{party.party}</h3>
              <p className="text-muted-foreground text-xs">
                {party.termsSeated} {party.termsSeated === 1 ? 'term' : 'terms'} seated
                {party.termsInGovernment > 0 ? ` · ${party.termsInGovernment} in government` : ''}
              </p>
            </div>
            {party.inGovernmentNow ? (
              <Badge
                style={{ backgroundColor: party.color, color: '#fff' }}
                className="border-transparent"
              >
                In government
              </Badge>
            ) : party.currentSeats ? (
              <Badge variant="outline">Opposition</Badge>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Metric label="Seats now" value={party.currentSeats ?? '—'} accent={party.color} />
            <Metric
              label="Peak"
              value={party.peakSeats || '—'}
              hint={party.peakYear ?? undefined}
            />
            <Metric label="MPs tracked" value={party.mpCount} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function Metric({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: number;
  accent?: string;
}) {
  return (
    <div className="border-border/50 bg-background/30 flex flex-col gap-0.5 rounded-lg border p-2.5">
      <span className="text-muted-foreground text-[10px] tracking-widest uppercase">{label}</span>
      <span
        className="text-xl font-semibold tabular-nums"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </span>
      {hint ? <span className="text-muted-foreground text-[10px]">{hint}</span> : null}
    </div>
  );
}
