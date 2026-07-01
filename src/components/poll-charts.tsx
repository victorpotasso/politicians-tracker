'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { PollTrendPoint, SeatProjection } from '@/lib/data';
import { partyColor } from '@/lib/party';
import { formatMonthYearShort } from '@/lib/utils';

const tooltipStyle = {
  background: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--popover-foreground)',
  fontSize: 12,
} as const;

/** Format an ISO date as a short `Jun '26` axis/tooltip label (deterministic). */
function shortDate(iso: string): string {
  return formatMonthYearShort(iso);
}

interface PollTrendChartProps {
  data: PollTrendPoint[];
  parties: string[];
}

/** Multi-line trend of each major party's poll support over time. */
export function PollTrendChart({ data, parties }: PollTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={shortDate}
          minTickGap={40}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
        />
        <YAxis
          domain={[0, 'dataMax + 5']}
          unit="%"
          tickLine={false}
          axisLine={false}
          width={44}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(label) => shortDate(String(label))}
          formatter={(value, name) => [`${Number(value)}%`, String(name)]}
        />
        {parties.map((party) => (
          <Line
            key={party}
            type="monotone"
            dataKey={party}
            stroke={partyColor(party)}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bars of projected seats per party (Sainte-Laguë estimate). */
export function SeatProjectionChart({ data }: { data: SeatProjection[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ left: 12, right: 32 }}>
        <XAxis type="number" hide domain={[0, 'dataMax + 4']} />
        <YAxis
          type="category"
          dataKey="party"
          width={150}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: 'var(--accent)', opacity: 0.4 }}
          contentStyle={tooltipStyle}
          formatter={(value) => [`${Number(value)} seats`, 'Projected']}
        />
        <Bar dataKey="seats" radius={[4, 4, 4, 4]} barSize={22}>
          {data.map((entry) => (
            <Cell key={entry.party} fill={partyColor(entry.party)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface PartyPollTrendProps {
  data: { date: string; percentage: number }[];
  color: string;
}

/** Compact area chart of a single party's polling, for the party detail page. */
export function PartyPollTrend({ data, color }: PartyPollTrendProps) {
  const gradientId = `poll-fill-${color.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={shortDate}
          minTickGap={40}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
        />
        <YAxis
          domain={[0, 'dataMax + 5']}
          unit="%"
          tickLine={false}
          axisLine={false}
          width={40}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(label) => shortDate(String(label))}
          formatter={(value) => [`${Number(value)}%`, 'Support']}
        />
        <Area
          type="monotone"
          dataKey="percentage"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4 }}
          connectNulls
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
