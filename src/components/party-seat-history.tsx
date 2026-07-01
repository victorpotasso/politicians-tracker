'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { SeatHistoryPoint } from '@/lib/data';

interface PartySeatHistoryProps {
  data: SeatHistoryPoint[];
  color: string;
}

/** Area chart tracing a party's seat count across the MMP-era elections. */
export function PartySeatHistory({ data, color }: PartySeatHistoryProps) {
  const gradientId = `seat-fill-${color.replace(/[^a-z0-9]/gi, '')}`;
  const maxSeats = Math.max(...data.map((d) => d.seats), 1);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.6} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="year"
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
        />
        <YAxis
          allowDecimals={false}
          domain={[0, Math.ceil((maxSeats + 4) / 5) * 5]}
          tickLine={false}
          axisLine={false}
          width={36}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
        />
        <Tooltip
          cursor={{ stroke: 'var(--border)' }}
          contentStyle={{
            background: 'var(--popover)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--popover-foreground)',
            fontSize: 12,
          }}
          formatter={(value, _name, item) => {
            const total = (item?.payload as SeatHistoryPoint | undefined)?.totalSeats;
            return [`${Number(value)}${total ? ` / ${total}` : ''} seats`, 'Seats'];
          }}
        />
        <Area
          type="monotone"
          dataKey="seats"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={{ r: 3, fill: color, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
