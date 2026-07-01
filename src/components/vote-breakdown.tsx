import { partyColor } from '@/lib/party';
import { cn } from '@/lib/utils';
import type { Vote } from '@/types/records';

/** A proportional aye/nay tally bar for a division. */
export function TallyBar({ ayes, noes }: { ayes: number; noes: number }) {
  const total = Math.max(1, ayes + noes);
  return (
    <div
      className="flex h-2.5 overflow-hidden rounded-full"
      role="img"
      aria-label={`${ayes} ayes, ${noes} noes`}
    >
      <div className="bg-emerald-500" style={{ width: `${(ayes / total) * 100}%` }} />
      <div className="bg-rose-500" style={{ width: `${(noes / total) * 100}%` }} />
    </div>
  );
}

/** A compact, party-coloured chip for an MP's vote. */
export function VoteChip({ vote }: { vote: Vote }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs"
      style={{ borderColor: `${partyColor(vote.party)}66` }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: partyColor(vote.party) }}
        aria-hidden
      />
      {vote.name}
    </span>
  );
}

interface VoteColumnProps {
  title: string;
  tone: 'aye' | 'nay';
  votes: Vote[];
}

export function VoteColumn({ title, tone, votes }: VoteColumnProps) {
  return (
    <div className="flex flex-col gap-2">
      <p
        className={cn(
          'text-xs font-semibold uppercase tracking-wide',
          tone === 'aye' ? 'text-emerald-500' : 'text-rose-500',
        )}
      >
        {title} · {votes.length}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {votes.map((v) => (
          <VoteChip key={`${v.voteId}-${v.mpId}`} vote={v} />
        ))}
        {votes.length === 0 ? <span className="text-muted-foreground text-xs">None</span> : null}
      </div>
    </div>
  );
}
