import { CalendarDays, CalendarRange, Receipt, ShoppingBag, ShoppingCart, Wallet } from "lucide-react";

import { BigStat } from "@/components/common/big-stat";
import { formatMoney, formatNumber, formatSignedPercent } from "@/lib/format";
import { changeRatio, type Overview } from "@/lib/metrics";

interface Comparison {
  caption: string;
  trend?: "up" | "down";
  trendGood?: boolean;
}

/** "+8% vs last month" when there is something to compare with, otherwise the fallback line. */
function compare(current: number, previous: number, against: string, fallback: string): Comparison {
  const change = changeRatio(current, previous);
  if (change === null) return { caption: fallback };
  return {
    caption: `${formatSignedPercent(change)} ${against}`,
    trend: change >= 0 ? "up" : "down",
    trendGood: change >= 0,
  };
}

/** Steps the number down one size on phones so a seven-digit figure fits a half-width card. */
function Value({ children }: { children: string }) {
  return <span className="text-2xl sm:text-3xl lg:text-4xl">{children}</span>;
}

/** The six big numbers on top of the Sales page. */
export function SalesStats({ overview: o }: { overview: Overview }) {
  const today = compare(o.salesToday, o.salesSameDayLastWeek, "vs the same day last week", "Nothing to compare with yet");
  const week = compare(o.week.sales, o.previousWeek.sales, "vs last week", "First week of sales");
  const month = compare(o.month.sales, o.previousMonth.sales, "vs last month", "First month of sales");
  const orders = compare(o.month.orders, o.previousMonth.orders, "vs last month", "Last 30 days");
  const avgOrder = compare(o.month.avgOrder, o.previousMonth.avgOrder, "vs last month", "Last 30 days");
  const profit = compare(o.month.profit, o.previousMonth.profit, "vs last month", "Last 30 days");

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      <BigStat label="Sales Today" value={<Value>{formatMoney(o.salesToday)}</Value>} icon={ShoppingBag} tone="brand" {...today} />
      <BigStat label="Sales This Week" value={<Value>{formatMoney(o.week.sales)}</Value>} icon={CalendarDays} {...week} />
      <BigStat label="Sales This Month" value={<Value>{formatMoney(o.month.sales)}</Value>} icon={CalendarRange} {...month} />
      <BigStat label="Number of Orders" value={<Value>{formatNumber(o.month.orders)}</Value>} icon={ShoppingCart} {...orders} />
      <BigStat label="Average Order" value={<Value>{formatMoney(o.month.avgOrder)}</Value>} icon={Receipt} {...avgOrder} />
      <BigStat label="Profit" value={<Value>{formatMoney(o.month.profit)}</Value>} icon={Wallet} tone="success" {...profit} />
    </div>
  );
}
