'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { CompositionPoint, SeatTypeSplit } from '@/lib/data';
import { partyColor } from '@/lib/party';

const tooltipStyle = {
  background: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--popover-foreground)',
  fontSize: 12,
} as const;

/** Stacked area of Parliament's party make-up across the MMP-era elections. */
export function CompositionChart({
  data,
  parties,
}: {
  data: CompositionPoint[];
  parties: string[];
}) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
        <defs>
          {parties.map((party) => (
            <linearGradient
              key={party}
              id={`comp-${party.replace(/[^a-z0-9]/gi, '')}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={partyColor(party)} stopOpacity={0.85} />
              <stop offset="100%" stopColor={partyColor(party)} stopOpacity={0.35} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="year"
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={40}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
        />
        <Tooltip contentStyle={tooltipStyle} />
        {parties.map((party) => (
          <Area
            key={party}
            type="monotone"
            dataKey={party}
            stackId="seats"
            stroke={partyColor(party)}
            strokeWidth={1}
            fill={`url(#comp-${party.replace(/[^a-z0-9]/gi, '')})`}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

const SEAT_TYPE_COLORS: Record<string, string> = {
  Electorate: 'var(--chart-2)',
  List: 'var(--chart-4)',
};

/** Donut of electorate vs list seats in the current Parliament. */
export function ElectorateListDonut({ data }: { data: SeatTypeSplit[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="type"
          innerRadius={58}
          outerRadius={92}
          paddingAngle={2}
          stroke="var(--background)"
        >
          {data.map((entry) => (
            <Cell key={entry.type} fill={SEAT_TYPE_COLORS[entry.type] ?? 'var(--chart-3)'} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name) => [`${value} seats`, String(name)]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
