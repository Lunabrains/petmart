"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { Purchase } from "@/lib/data";
import { formatDate, formatDateShort, formatNumber, formatPrice } from "@/lib/format";
import type { ProductDay } from "@/lib/metrics";

const tick = { fill: "var(--muted-foreground)", fontSize: 12 };
const tooltipStyle = { borderRadius: 12, border: "1px solid var(--border)", boxShadow: "0 4px 16px rgb(0 0 0 / 0.08)", fontSize: 13 };

interface WeekPoint {
  weekStart: string;
  units: number;
}

/** Units sold per week over the last ~13 weeks. Weekly bars read better than 90 daily ones. */
export function ProductSalesChart({ days, height = 220 }: { days: ProductDay[]; height?: number }) {
  const weeks: WeekPoint[] = [];
  // Group from the most recent day backwards so the last bar is a full week ending today.
  const reversed = [...days].reverse();
  for (let i = 0; i < reversed.length; i += 7) {
    const chunk = reversed.slice(i, i + 7);
    weeks.unshift({ weekStart: chunk[chunk.length - 1].date, units: chunk.reduce((t, d) => t + d.units, 0) });
  }
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={weeks} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="weekStart" tickFormatter={(d: string) => formatDateShort(d)} tickLine={false} axisLine={false} tick={tick} dy={6} />
          <YAxis tickFormatter={(v: number) => formatNumber(v)} tickLine={false} axisLine={false} width={40} tick={tick} allowDecimals={false} />
          <Tooltip
            formatter={(v) => [`${formatNumber(Number(v))} sold`, ""]}
            labelFormatter={(l) => `Week of ${formatDate(String(l))}`}
            contentStyle={tooltipStyle}
            cursor={{ fill: "var(--accent)" }}
          />
          <Bar dataKey="units" fill="var(--chart-1)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface CostChartProps {
  purchases: Purchase[];
  /** Current selling price, drawn as a flat reference line. */
  price: number;
  height?: number;
}

/** What each delivery cost, step by step, against the selling price. */
export function ProductCostChart({ purchases, price, height = 220 }: CostChartProps) {
  const data = purchases.map((p) => ({ date: p.date, cost: p.cost }));
  const costs = data.map((d) => d.cost);
  const min = Math.min(...costs, price) * 0.9;
  const max = Math.max(...costs, price) * 1.08;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="date" tickFormatter={(d: string) => formatDateShort(d)} tickLine={false} axisLine={false} tick={tick} dy={6} />
          <YAxis domain={[min, max]} tickFormatter={(v: number) => formatPrice(v)} tickLine={false} axisLine={false} width={64} tick={tick} />
          <Tooltip
            formatter={(v) => [formatPrice(Number(v)), "Cost"]}
            labelFormatter={(l) => `Delivery on ${formatDate(String(l))}`}
            contentStyle={tooltipStyle}
            cursor={{ stroke: "var(--border)" }}
          />
          <ReferenceLine y={price} stroke="var(--chart-3)" strokeDasharray="4 3" label={{ value: `Selling price ${formatPrice(price)}`, position: "insideTopRight", fill: "var(--muted-foreground)", fontSize: 12 }} />
          <Line type="stepAfter" dataKey="cost" stroke="var(--chart-2)" strokeWidth={2.25} dot={{ r: 4, fill: "var(--chart-2)", strokeWidth: 0 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
