import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { Bill, Vote } from '@/types/records';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function VoteList({ votes, bills }: { votes: Vote[]; bills: Bill[] }) {
  const billTitle = new Map(bills.map((b) => [b.billId, b.title]));
  const sorted = [...votes].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((vote) => (
        <li key={vote.voteId}>
          <Card className="bg-card/60 py-4 backdrop-blur-sm">
            <CardContent className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{vote.issue ?? 'Division'}</p>
                <p className="text-muted-foreground text-xs">
                  {vote.billId ? (billTitle.get(vote.billId) ?? vote.billId) : 'Unlinked'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {vote.stage ? <Badge variant="outline">{vote.stage}</Badge> : null}
                <span className="text-muted-foreground text-xs tabular-nums">
                  {formatDate(vote.date)}
                </span>
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
