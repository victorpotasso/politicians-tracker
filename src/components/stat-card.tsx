import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
  accent?: string;
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = 'var(--brand)',
}: StatCardProps) {
  return (
    <Card className="interactive-card bg-card/70 relative overflow-hidden backdrop-blur-sm">
      {Icon ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-8 -right-8 size-24 rounded-full opacity-10 blur-xl"
          style={{ backgroundColor: accent }}
        />
      ) : null}
      <CardContent className="relative flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <CardDescription className="pt-1">{label}</CardDescription>
          {Icon ? (
            <span
              className="border-border/60 bg-background/55 grid size-9 shrink-0 place-items-center rounded-lg border shadow-sm"
              style={{ color: accent }}
              aria-hidden
            >
              <Icon className="size-4" />
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-1">
          <CardTitle className="text-2xl font-semibold tabular-nums sm:text-3xl">{value}</CardTitle>
          {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
