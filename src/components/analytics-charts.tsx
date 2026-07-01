'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatNZD, formatNZDCompact } from '@/lib/utils';

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

// Recharts colours tooltip text by the series colour by default; pin it to the
// popover foreground so labels stay legible (the dot still identifies the series).
const tooltipLabelStyle = {
  color: 'var(--popover-foreground)',
  fontWeight: 500,
  marginBottom: 2,
} as const;
const tooltipItemStyle = { color: 'var(--popover-foreground)' } as const;
const legendStyle = { fontSize: 12, color: 'var(--muted-foreground)' } as const;

const CATEGORY_LABEL: Record<string, string> = {
  accommodation: 'Accommodation',
  travel: 'Travel',
  other: 'Other',
};

export interface PartySpendRow {
  party: string;
  accommodation: number;
  travel: number;
  other: number;
  total: number;
}

/** Horizontal stacked bars of spend per party, split by expense category. */
export function PartySpendChart({ data }: { data: PartySpendRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 42)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v: number) => formatNZDCompact(v)}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
        />
        <YAxis
          type="category"
          dataKey="party"
          width={150}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
        />
        <Tooltip
          cursor={{ fill: 'var(--accent)', opacity: 0.35 }}
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          formatter={(value, name) => [
            formatNZD(Number(value)),
            CATEGORY_LABEL[String(name)] ?? String(name),
          ]}
        />
        <Legend
          wrapperStyle={legendStyle}
          formatter={(name) => CATEGORY_LABEL[String(name)] ?? name}
        />
        <Bar dataKey="accommodation" stackId="s" fill={CATEGORY_COLORS.accommodation} />
        <Bar dataKey="travel" stackId="s" fill={CATEGORY_COLORS.travel} />
        <Bar dataKey="other" stackId="s" radius={[0, 4, 4, 0]} fill={CATEGORY_COLORS.other} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export interface SeatTypeRow {
  category: string;
  electorate: number;
  list: number;
}

/** Grouped bars comparing average per-MP spend for electorate vs list members. */
export function SeatTypeChart({ data }: { data: SeatTypeRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="category"
          tickFormatter={(v: string) => CATEGORY_LABEL[v] ?? v}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
        />
        <YAxis
          tickFormatter={(v: number) => formatNZDCompact(v)}
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
          labelFormatter={(label) => CATEGORY_LABEL[String(label)] ?? String(label)}
          formatter={(value, name) => [
            formatNZD(Number(value)),
            name === 'electorate' ? 'Electorate MPs' : 'List MPs',
          ]}
        />
        <Legend
          wrapperStyle={legendStyle}
          formatter={(name) => (name === 'electorate' ? 'Electorate MPs' : 'List MPs')}
        />
        <Bar dataKey="electorate" radius={[3, 3, 0, 0]} fill="var(--chart-1)" />
        <Bar dataKey="list" radius={[3, 3, 0, 0]} fill="var(--chart-2)" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export interface DisciplineRow {
  label: string;
  rate: number;
  color: string;
}

/** Horizontal bars of party-line deviation rate (0–1) rendered as a percentage. */
export function DisciplineChart({ data }: { data: DisciplineRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis
          type="number"
          domain={[0, 'dataMax']}
          tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={150}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
        />
        <Tooltip
          cursor={{ fill: 'var(--accent)', opacity: 0.35 }}
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          formatter={(value) => [`${(Number(value) * 100).toFixed(1)}%`, 'Broke party line']}
        />
        <Bar dataKey="rate" radius={[0, 4, 4, 0]} barSize={18}>
          {data.map((entry) => (
            <Cell key={entry.label} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
