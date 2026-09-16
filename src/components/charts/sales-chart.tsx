"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatDate, formatDateShort, formatMoney, formatMoneyCompact } from "@/lib/format";
import type { DayTotals } from "@/lib/metrics";
import { cn } from "@/lib/utils";

const PERIODS = [7, 30, 90] as const;
export type ChartPeriod = (typeof PERIODS)[number];

interface SalesChartProps {
  /** Daily totals, oldest first, covering at least the longest period offered. */
  series: DayTotals[];
  /** Period shown first. */
  initialDays?: ChartPeriod;
  /** Show the 7 / 30 / 90 day switch. */
  periods?: boolean;
  height?: number;
  className?: string;
}

const tick = { fill: "var(--muted-foreground)", fontSize: 12 };

/** Sales over time. One line, one colour, a period switch. */
export function SalesChart({ series, initialDays = 30, periods = false, height = 260, className }: SalesChartProps) {
  const [days, setDays] = useState<ChartPeriod>(initialDays);
  const data = series.slice(-days);
  const tickEvery = days === 7 ? 1 : days === 30 ? 5 : 15;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {periods && (
        <div className="flex gap-1 self-start rounded-lg bg-muted p-1" role="tablist" aria-label="Period">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={days === p}
              onClick={() => setDays(p)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                days === p ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p} Days
            </button>
          ))}
        </div>
      )}
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) => formatDateShort(d)}
              tickLine={false}
              axisLine={false}
              tick={tick}
              dy={6}
              interval={tickEvery - 1}
            />
            <YAxis tickFormatter={(v: number) => formatMoneyCompact(v)} tickLine={false} axisLine={false} width={56} tick={tick} />
            <Tooltip
              formatter={(v, name) => [formatMoney(Number(v)), name === "sales" ? "Sales" : "Profit"]}
              labelFormatter={(l) => formatDate(String(l))}
              contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", boxShadow: "0 4px 16px rgb(0 0 0 / 0.08)", fontSize: 13 }}
              cursor={{ stroke: "var(--border)" }}
            />
            <Area type="monotone" dataKey="sales" name="sales" stroke="var(--chart-1)" strokeWidth={2.25} fill="url(#salesFill)" isAnimationActive={false} />
            <Area type="monotone" dataKey="profit" name="profit" stroke="var(--chart-3)" strokeWidth={1.5} strokeDasharray="4 3" fill="transparent" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
