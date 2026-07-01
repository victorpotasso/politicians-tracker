import type { ReactNode } from 'react';

import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
}

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <Card className="interactive-card bg-card/70 backdrop-blur-sm">
      <CardContent className="flex flex-col gap-1">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl font-semibold tabular-nums">{value}</CardTitle>
        {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
