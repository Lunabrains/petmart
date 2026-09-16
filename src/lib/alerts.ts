import type { Dataset } from "./data/types";
import { formatMoney, formatPercent, formatPrice } from "./format";
import {
  allProductStats,
  costIncreases,
  historyDays,
  lowStock,
  noSales,
  profitDrops,
  runningLow,
  sellingLess,
  slowProducts,
  type ProductStats,
} from "./metrics";

/**
 * Alerts are derived, never stored: the same product facts always produce the
 * same alert with the same id, so "seen" / "done" can be remembered by id.
 */

export type AlertCategory = "stock" | "sales" | "profit";
export type AlertLevel = "red" | "orange";
export type AlertStatus = "new" | "seen" | "done";
export type AlertRule =
  | "running-low"
  | "low-stock"
  | "slow"
  | "no-sales"
  | "selling-less"
  | "cost-increase"
  | "profit-drop";

export interface Alert {
  id: string;
  rule: AlertRule;
  category: AlertCategory;
  level: AlertLevel;
  /** Short label, e.g. "Running Low". */
  title: string;
  /** One or two plain sentences. */
  message: string;
  productId: string;
  productName: string;
  href: string;
  /** Money at stake, used to order alerts within a level. */
  amount: number;
}

export const ALERT_CATEGORY_LABEL: Record<AlertCategory, string> = {
  stock: "Stock",
  sales: "Sales",
  profit: "Profit",
};

const daysWord = (days: number) => (days === 1 ? "1 day" : `${days} days`);

function make(rule: AlertRule, category: AlertCategory, level: AlertLevel, s: ProductStats, title: string, message: string, amount: number): Alert {
  return {
    id: `${rule}:${s.product.id}`,
    rule,
    category,
    level,
    title,
    message,
    productId: s.product.id,
    productName: s.product.name,
    href: `/products/${s.product.id}`,
    amount,
  };
}

function runningLowAlert(s: ProductStats): Alert {
  const days = Math.max(0, Math.floor(s.daysLeft ?? 0));
  const when = days === 0 ? "may run out today" : `may run out in ${daysWord(days)}`;
  return make("running-low", "stock", "red", s, "Running Low", `${s.product.name} ${when}. ${s.product.stock} left, selling about ${perDay(s.avgDaily)}.`, s.revenue30);
}

function lowStockAlert(s: ProductStats): Alert {
  const days = Math.round(s.daysLeft ?? 0);
  return make("low-stock", "stock", "orange", s, "Low Stock", `${s.product.name} has around ${daysWord(days)} of stock left.`, s.revenue30);
}

function slowAlert(s: ProductStats): Alert {
  return make("slow", "stock", "orange", s, "Slow Product", `${formatMoney(s.stockValue)} is sitting in this product with almost no sales. ${s.units60} sold in the last 60 days.`, s.stockValue);
}

function noSalesAlert(s: ProductStats, history: number): Alert {
  const since = s.lastSaleDaysAgo === null ? `No sales in the last ${history} days` : `No sales for ${daysWord(s.lastSaleDaysAgo)}`;
  return make("no-sales", "stock", "orange", s, "No Sales", `${since}. ${formatMoney(s.stockValue)} is sitting in stock.`, s.stockValue);
}

function sellingLessAlert(s: ProductStats): Alert {
  const drop = formatPercent(Math.abs(s.salesChange ?? 0));
  return make("selling-less", "sales", "orange", s, "Selling Less", `Sold ${s.units30} in the last 30 days, down ${drop} from ${s.unitsPrev30} the month before.`, s.revenue30);
}

function costIncreaseAlert(s: ProductStats): Alert {
  const c = s.costChange!;
  const priceNote = c.priceChanged ? "The selling price was adjusted." : "The selling price stayed the same.";
  return make("cost-increase", "profit", "orange", s, "Cost Increased", `Supplier cost increased by ${formatPercent(c.changePct)} (from ${formatPrice(c.previousCost)} to ${formatPrice(c.currentCost)}). ${priceNote}`, s.revenue30);
}

function profitDropAlert(s: ProductStats): Alert {
  const c = s.costChange!;
  return make("profit-drop", "profit", "red", s, "Profit Dropped", `Cost went up from ${formatPrice(c.previousCost)} to ${formatPrice(c.currentCost)} but the selling price stayed at ${formatPrice(c.currentPrice)}. Profit per unit fell from ${formatPrice(c.profitPerUnitBefore)} to ${formatPrice(c.profitPerUnitNow)}.`, s.revenue30);
}

function perDay(units: number): string {
  return `${units >= 10 ? Math.round(units) : Math.round(units * 10) / 10} a day`;
}

const LEVEL_ORDER: Record<AlertLevel, number> = { red: 0, orange: 1 };

const alertsCache = new WeakMap<Dataset, Alert[]>();

/** All open problems, red first, then by money at stake. */
export function buildAlerts(data: Dataset): Alert[] {
  const cached = alertsCache.get(data);
  if (cached) return cached;

  const history = historyDays(data);
  const alerts: Alert[] = [
    ...runningLow(data).map(runningLowAlert),
    ...lowStock(data).map(lowStockAlert),
    ...slowProducts(data).map(slowAlert),
    ...noSales(data).map((s) => noSalesAlert(s, history)),
    ...sellingLess(data).map(sellingLessAlert),
    ...costIncreases(data).map(costIncreaseAlert),
    ...profitDrops(data).map(profitDropAlert),
  ];
  alerts.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || b.amount - a.amount);
  alertsCache.set(data, alerts);
  return alerts;
}

export function alertsForProduct(data: Dataset, productId: string): Alert[] {
  return buildAlerts(data).filter((a) => a.productId === productId);
}

export function alertsByCategory(data: Dataset, category: AlertCategory): Alert[] {
  return buildAlerts(data).filter((a) => a.category === category);
}

/** Sanity helper for tests: every alert must point at a real product. */
export function alertProductIds(data: Dataset): Set<string> {
  return new Set(allProductStats(data).map((s) => s.product.id));
}
