"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Lazy-loaded (via next/dynamic) so Recharts stays out of first-load JS (§4, §7). */
export default function TrendChart({
  data,
  yMax = 100,
}: {
  data: { day: number; score: number }[];
  yMax?: number;
}) {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <XAxis
            dataKey="day"
            tickFormatter={(d) => `D${d}`}
            stroke="var(--muted)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, yMax]}
            stroke="var(--muted)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={36}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              color: "var(--fg)",
              fontSize: 13,
            }}
            labelFormatter={(d) => `Day ${d}`}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="var(--primary)"
            strokeWidth={3}
            dot={{ r: 4, fill: "var(--primary)" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
