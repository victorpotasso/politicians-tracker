import Link from 'next/link';
import { partyColor } from '@/lib/party';

export interface RankItem {
  label: string;
  value: number;
  accent?: string;
  href?: string;
  sublabel?: string;
}

interface RankingListProps {
  items: RankItem[];
  formatValue?: (value: number) => string;
}

/** Horizontal-bar leaderboard for a set of ranked items. */
export function RankingList({ items, formatValue }: RankingListProps) {
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <ol className="flex flex-col gap-3">
      {items.map((item, index) => {
        const label = item.href ? (
          <Link href={item.href} className="truncate text-sm font-medium hover:underline">
            {item.label}
          </Link>
        ) : (
          <span className="truncate text-sm font-medium">{item.label}</span>
        );
        return (
          <li key={item.label} className="flex items-center gap-3">
            <span className="text-muted-foreground w-5 shrink-0 text-right text-sm tabular-nums">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-baseline gap-2">
                  {label}
                  {item.sublabel ? (
                    <span className="text-muted-foreground shrink-0 text-xs">{item.sublabel}</span>
                  ) : null}
                </div>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {formatValue ? formatValue(item.value) : item.value}
                </span>
              </div>
              <div className="bg-muted h-2 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(item.value / max) * 100}%`,
                    backgroundColor: item.accent ?? partyColor(item.label),
                  }}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
