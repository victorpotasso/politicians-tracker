'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatMillionsNZD } from '@/lib/utils';

const tooltipStyle = {
  background: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--popover-foreground)',
  fontSize: 12,
} as const;

/** Recharts renders the label/items in the series colour by default; force the
 * popover foreground so tooltip text stays legible on the dark surface. */
const tooltipLabelStyle = {
  color: 'var(--popover-foreground)',
  fontWeight: 500,
  marginBottom: 2,
} as const;
const tooltipItemStyle = { color: 'var(--popover-foreground)' } as const;

export interface SpendingBar {
  year: number;
  value: number | null;
  color: string;
  pm: string;
  party: string;
}

interface SpendingBarChartProps {
  data: SpendingBar[];
  /** Whether values are a percentage of GDP rather than NZD millions. */
  percent: boolean;
}

/** Format a metric value for axes/tooltips. */
function formatValue(value: number, percent: boolean): string {
  return percent ? `${value.toFixed(1)}%` : formatMillionsNZD(value);
}

/** Vertical bar chart of a spending metric per fiscal year, coloured by government. */
export function SpendingBarChart({ data, percent }: SpendingBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={360}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="year"
          minTickGap={16}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
        />
        <YAxis
          tickFormatter={(v: number) => formatValue(v, percent)}
          tickLine={false}
          axisLine={false}
          width={52}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
        />
        <Tooltip
          cursor={{ fill: 'var(--accent)', opacity: 0.35 }}
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          labelFormatter={(label) => `Year ended ${label}`}
          formatter={(value, _name, item) => [
            formatValue(Number(value), percent),
            (item?.payload as SpendingBar | undefined)?.pm ?? 'Spend',
          ]}
        />
        <Bar dataKey="value" radius={[3, 3, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.year} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export interface BreakdownBar {
  category: string;
  amount: number;
}

/** Horizontal bars of Core Crown spend by functional class for a single year. */
export function SpendingBreakdownChart({ data }: { data: BreakdownBar[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" hide domain={[0, 'dataMax']} />
        <YAxis
          type="category"
          dataKey="category"
          width={180}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
        />
        <Tooltip
          cursor={{ fill: 'var(--accent)', opacity: 0.35 }}
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          formatter={(value) => [formatMillionsNZD(Number(value)), 'Spend']}
        />
        <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={18} fill="var(--chart-1)" />
      </BarChart>
    </ResponsiveContainer>
  );
}
