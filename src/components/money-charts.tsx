'use client';

import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { CategoryTotal, PeriodTotal } from '@/lib/data';
import { formatNZD, formatNZDCompact, formatQuarterLong, formatQuarterShort } from '@/lib/utils';

const CATEGORY_COLORS: Record<string, string> = {
  accommodation: 'var(--chart-1)',
  travel: 'var(--chart-2)',
  other: 'var(--chart-4)',
};

const tooltipStyle = {
  background: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--popover-foreground)',
  fontSize: 12,
} as const;

/** Donut of total spend split by expense category. */
export function SpendByCategoryDonut({ data }: { data: CategoryTotal[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="amount"
          nameKey="category"
          innerRadius={58}
          outerRadius={92}
          paddingAngle={2}
          stroke="var(--background)"
        >
          {data.map((entry) => (
            <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] ?? 'var(--chart-3)'} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name) => [formatNZD(Number(value)), String(name)]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Area chart of total recorded spend per quarter. */
export function SpendTrendChart({ data }: { data: PeriodTotal[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
        <defs>
          <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.6} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="period"
          tickFormatter={formatQuarterShort}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
        />
        <YAxis
          tickFormatter={(v: number) => formatNZDCompact(v)}
          tickLine={false}
          axisLine={false}
          width={48}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(label) => formatQuarterLong(String(label))}
          formatter={(value) => [formatNZD(Number(value)), 'Spend']}
        />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#spendFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
