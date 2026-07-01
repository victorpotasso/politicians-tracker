'use client';

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { PartyCount } from '@/lib/data';
import { partyColor } from '@/lib/party';

export function PartyChart({ data }: { data: PartyCount[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ left: 12, right: 24 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="party"
          width={140}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: 'var(--accent)', opacity: 0.4 }}
          contentStyle={{
            background: 'var(--popover)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--popover-foreground)',
            fontSize: 12,
          }}
        />
        <Bar dataKey="count" radius={[4, 4, 4, 4]} barSize={20}>
          {data.map((entry) => (
            <Cell key={entry.party} fill={partyColor(entry.party)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
