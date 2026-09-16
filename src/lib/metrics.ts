import { differenceInCalendarDays, parseISO } from "date-fns";

import type { Dataset, Product, Purchase } from "./data/types";

/**
 * Every number on every screen comes from here. The calculations are the
 * simple ones from the brief, nothing more:
 *
 *   Sales            = sum of quantity x selling price in the period
 *   Profit           = sales - (quantity x cost at the time)
 *   Stock value      = current stock x latest cost
 *   Average daily    = units sold in the last 30 days / 30
 *   Days left        = current stock / average daily sales
 *   Cost increase    = latest delivery cost vs the delivery before it
 */

export const RULES = {
  /** Fewer estimated days of stock than this = running low. */
  runningLowDays: 7,
  /** Fewer estimated days of stock than this = low stock. */
  lowStockDays: 14,
  /** This many units or fewer sold in the last 60 days = slow. */
  slowUnitsIn60Days: 5,
  /** No sales for this many days = no sales. */
  noSalesDays: 90,
  /** More estimated days of stock than this = too much stock. */
  overstockDays: 120,
  /** Purchase cost up by more than this = cost increase alert. */
  costIncreasePct: 0.05,
  /** Cost up by more than this with the same selling price = profit dropped. */
  profitDropPct: 0.02,
  /** Units down by at least this much vs the previous 30 days = selling less. */
  sellingLessDropPct: 0.25,
  /** Only products that sold at least this many units before count as selling less. */
  sellingLessMinUnits: 10,
} as const;

export type ProductStatus = "running-low" | "low-stock" | "no-sales" | "slow" | "overstocked" | "ok";

export interface DayTotals {
  date: string;
  daysAgo: number;
  sales: number;
  profit: number;
  units: number;
  orders: number;
}

export interface PeriodTotals {
  sales: number;
  profit: number;
  units: number;
  orders: number;
  avgOrder: number;
}

export interface CostChange {
  previousCost: number;
  currentCost: number;
  /** 0.125 = +12.5% */
  changePct: number;
  /** Date of the delivery that changed the cost. */
  date: string;
  previousPrice: number;
  currentPrice: number;
  priceChanged: boolean;
  profitPerUnitBefore: number;
  profitPerUnitNow: number;
  marginBefore: number;
  marginNow: number;
  /** Cost went up by more than RULES.costIncreasePct. */
  costIncreased: boolean;
  /** Cost went up (more than RULES.profitDropPct) and the selling price stayed the same. */
  profitDropped: boolean;
}

export interface ProductStats {
  product: Product;
  unitsToday: number;
  units7: number;
  units30: number;
  unitsPrev30: number;
  units60: number;
  units90: number;
  revenue30: number;
  profit30: number;
  /** Units per day over the last 30 days. */
  avgDaily: number;
  /** Estimated days of stock, or null when nothing sold in the last 30 days. */
  daysLeft: number | null;
  /** Days since the last sale, or null when there is no sale in the data at all. */
  lastSaleDaysAgo: number | null;
  stockValue: number;
  profitPerUnit: number;
  /** Profit per unit as a share of the selling price. */
  margin: number;
  /** Units last 30 days vs the 30 days before, or null when the product barely sold before. */
  salesChange: number | null;
  costChange: CostChange | null;
  status: ProductStatus;
}

export interface Overview {
  today: string;
  salesToday: number;
  profitToday: number;
  ordersToday: number;
  salesSameDayLastWeek: number;
  /** Today vs the same weekday last week, or null when there is nothing to compare with. */
  todayVsLastWeek: number | null;
  week: PeriodTotals;
  previousWeek: PeriodTotals;
  month: PeriodTotals;
  previousMonth: PeriodTotals;
  stockValue: number;
  runningLow: ProductStats[];
  lowStock: ProductStats[];
  slow: ProductStats[];
  noSales: ProductStats[];
  overstocked: ProductStats[];
  slowValue: number;
  noSalesValue: number;
  costIncreases: ProductStats[];
  profitDrops: ProductStats[];
  sellingLess: ProductStats[];
  bestSellers: ProductStats[];
}

// ---------------------------------------------------------------------------
// Index: one pass over the sales, then everything else is array sums.
// ---------------------------------------------------------------------------

interface ProductDaily {
  units: number[];
  revenue: number[];
  profit: number[];
  /** Last selling price seen on each day. */
  priceByDay: Array<number | undefined>;
  lastSaleDaysAgo: number | null;
}

interface Index {
  horizon: number;
  days: DayTotals[];
  byProduct: Map<string, ProductDaily>;
  purchasesByProduct: Map<string, Purchase[]>;
  daysAgoOf: (date: string) => number;
}

const indexCache = new WeakMap<Dataset, Index>();
const statsCache = new WeakMap<Dataset, ProductStats[]>();
const overviewCache = new WeakMap<Dataset, Overview>();

function buildIndex(data: Dataset): Index {
  const cached = indexCache.get(data);
  if (cached) return cached;

  const today = parseISO(data.today);
  const offsets = new Map<string, number>();
  const daysAgoOf = (date: string): number => {
    let d = offsets.get(date);
    if (d === undefined) {
      d = differenceInCalendarDays(today, parseISO(date));
      offsets.set(date, d);
    }
    return d;
  };

  let horizon = 120;
  for (const s of data.sales) horizon = Math.max(horizon, daysAgoOf(s.date) + 1);

  const days: DayTotals[] = [];
  const orderSets: Array<Set<string>> = [];
  for (let d = 0; d < horizon; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    days.push({ date: isoDate(date), daysAgo: d, sales: 0, profit: 0, units: 0, orders: 0 });
    orderSets.push(new Set());
  }

  const byProduct = new Map<string, ProductDaily>();
  for (const p of data.products) {
    byProduct.set(p.id, {
      units: new Array<number>(horizon).fill(0),
      revenue: new Array<number>(horizon).fill(0),
      profit: new Array<number>(horizon).fill(0),
      priceByDay: new Array<number | undefined>(horizon).fill(undefined),
      lastSaleDaysAgo: null,
    });
  }

  for (const s of data.sales) {
    const d = daysAgoOf(s.date);
    if (d < 0 || d >= horizon) continue;
    const revenue = s.quantity * s.price;
    const profit = s.quantity * (s.price - s.cost);
    const day = days[d];
    day.sales += revenue;
    day.profit += profit;
    day.units += s.quantity;
    orderSets[d].add(s.orderId);
    const pd = byProduct.get(s.productId);
    if (!pd) continue;
    pd.units[d] += s.quantity;
    pd.revenue[d] += revenue;
    pd.profit[d] += profit;
    pd.priceByDay[d] = s.price;
    if (pd.lastSaleDaysAgo === null || d < pd.lastSaleDaysAgo) pd.lastSaleDaysAgo = d;
  }
  days.forEach((day, d) => (day.orders = orderSets[d].size));

  const purchasesByProduct = new Map<string, Purchase[]>();
  for (const purchase of data.purchases) {
    const list = purchasesByProduct.get(purchase.productId) ?? [];
    list.push(purchase);
    purchasesByProduct.set(purchase.productId, list);
  }
  for (const list of purchasesByProduct.values()) list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const index: Index = { horizon, days, byProduct, purchasesByProduct, daysAgoOf };
  indexCache.set(data, index);
  return index;
}

function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function sum(values: number[], from: number, to: number): number {
  let total = 0;
  for (let i = from; i < to && i < values.length; i++) total += values[i];
  return total;
}

// ---------------------------------------------------------------------------
// Totals over time
// ---------------------------------------------------------------------------

/** How many days of sales history the data covers (at least 120). */
export function historyDays(data: Dataset): number {
  return buildIndex(data).horizon;
}

/** Totals for the `days` days ending `offset` days ago (offset 0 = ending today). */
export function periodTotals(data: Dataset, days: number, offset = 0): PeriodTotals {
  const { days: all } = buildIndex(data);
  const totals = { sales: 0, profit: 0, units: 0, orders: 0 };
  for (let d = offset; d < offset + days && d < all.length; d++) {
    totals.sales += all[d].sales;
    totals.profit += all[d].profit;
    totals.units += all[d].units;
    totals.orders += all[d].orders;
  }
  return { ...totals, avgOrder: totals.orders ? totals.sales / totals.orders : 0 };
}

/** One entry per day, oldest first, for the last `days` days including today. */
export function dailySeries(data: Dataset, days: number): DayTotals[] {
  const { days: all } = buildIndex(data);
  return all.slice(0, days).reverse();
}

/** Change of `current` vs `previous` as a ratio, or null when there is nothing to compare with. */
export function changeRatio(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return (current - previous) / previous;
}

// ---------------------------------------------------------------------------
// Per-product facts
// ---------------------------------------------------------------------------

function computeCostChange(p: Product, purchases: Purchase[], daily: ProductDaily, index: Index): CostChange | null {
  if (purchases.length < 2) return null;
  const last = purchases[purchases.length - 1];
  const previous = purchases[purchases.length - 2];
  if (previous.cost <= 0) return null;
  const changePct = (last.cost - previous.cost) / previous.cost;
  if (Math.abs(changePct) < 0.01) return null;

  // Selling price before the cost changed: the last price seen before the delivery.
  const changeDaysAgo = index.daysAgoOf(last.date);
  let previousPrice = p.price;
  for (let d = Math.max(changeDaysAgo + 1, 0); d < index.horizon; d++) {
    const seen = daily.priceByDay[d];
    if (seen !== undefined) {
      previousPrice = seen;
      break;
    }
  }
  const priceChanged = previousPrice > 0 && Math.abs(p.price - previousPrice) / previousPrice > 0.005;
  const profitPerUnitBefore = previousPrice - previous.cost;
  const profitPerUnitNow = p.price - last.cost;
  return {
    previousCost: previous.cost,
    currentCost: last.cost,
    changePct,
    date: last.date,
    previousPrice,
    currentPrice: p.price,
    priceChanged,
    profitPerUnitBefore,
    profitPerUnitNow,
    marginBefore: previousPrice > 0 ? profitPerUnitBefore / previousPrice : 0,
    marginNow: p.price > 0 ? profitPerUnitNow / p.price : 0,
    costIncreased: changePct > RULES.costIncreasePct,
    profitDropped: changePct > RULES.profitDropPct && !priceChanged,
  };
}

function statusFor(s: Omit<ProductStats, "status">): ProductStatus {
  const { stock } = s.product;
  if (s.daysLeft !== null && s.daysLeft < RULES.runningLowDays) return "running-low";
  if (s.daysLeft !== null && s.daysLeft < RULES.lowStockDays) return "low-stock";
  if (stock > 0 && (s.lastSaleDaysAgo === null || s.lastSaleDaysAgo >= RULES.noSalesDays)) return "no-sales";
  if (stock > 0 && s.units60 <= RULES.slowUnitsIn60Days) return "slow";
  if (s.daysLeft !== null && s.daysLeft >= RULES.overstockDays) return "overstocked";
  return "ok";
}

/** Stats for every product, computed once per dataset. */
export function allProductStats(data: Dataset): ProductStats[] {
  const cached = statsCache.get(data);
  if (cached) return cached;

  const index = buildIndex(data);
  const stats = data.products.map((product): ProductStats => {
    const daily = index.byProduct.get(product.id)!;
    const units30 = sum(daily.units, 0, 30);
    const unitsPrev30 = sum(daily.units, 30, 60);
    const avgDaily = units30 / 30;
    const profitPerUnit = product.price - product.cost;
    const base = {
      product,
      unitsToday: daily.units[0] ?? 0,
      units7: sum(daily.units, 0, 7),
      units30,
      unitsPrev30,
      units60: sum(daily.units, 0, 60),
      units90: sum(daily.units, 0, 90),
      revenue30: sum(daily.revenue, 0, 30),
      profit30: sum(daily.profit, 0, 30),
      avgDaily,
      daysLeft: avgDaily > 0 ? product.stock / avgDaily : null,
      lastSaleDaysAgo: daily.lastSaleDaysAgo,
      stockValue: product.stock * product.cost,
      profitPerUnit,
      margin: product.price > 0 ? profitPerUnit / product.price : 0,
      salesChange: unitsPrev30 >= RULES.sellingLessMinUnits ? (units30 - unitsPrev30) / unitsPrev30 : null,
      costChange: computeCostChange(product, index.purchasesByProduct.get(product.id) ?? [], daily, index),
    };
    return { ...base, status: statusFor(base) };
  });
  statsCache.set(data, stats);
  return stats;
}

export function getProductStats(data: Dataset, productId: string): ProductStats | undefined {
  return allProductStats(data).find((s) => s.product.id === productId);
}

export interface ProductDay {
  date: string;
  units: number;
  sales: number;
  profit: number;
}

/** Daily units / sales for one product, oldest first. */
export function productSalesHistory(data: Dataset, productId: string, days = 90): ProductDay[] {
  const index = buildIndex(data);
  const daily = index.byProduct.get(productId);
  if (!daily) return [];
  const out: ProductDay[] = [];
  for (let d = Math.min(days, index.horizon) - 1; d >= 0; d--) {
    out.push({ date: index.days[d].date, units: daily.units[d], sales: daily.revenue[d], profit: daily.profit[d] });
  }
  return out;
}

/** Deliveries for one product, oldest first. */
export function productCostHistory(data: Dataset, productId: string): Purchase[] {
  return buildIndex(data).purchasesByProduct.get(productId) ?? [];
}

// ---------------------------------------------------------------------------
// Lists the screens show
// ---------------------------------------------------------------------------

const byRevenue = (a: ProductStats, b: ProductStats) => b.revenue30 - a.revenue30;
const byDaysLeft = (a: ProductStats, b: ProductStats) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity);
const byStockValue = (a: ProductStats, b: ProductStats) => b.stockValue - a.stockValue;

export function bestSellers(data: Dataset, limit = 10): ProductStats[] {
  return [...allProductStats(data)].sort(byRevenue).slice(0, limit);
}

/** Products whose units dropped by at least RULES.sellingLessDropPct vs the previous 30 days. */
export function sellingLess(data: Dataset): ProductStats[] {
  return allProductStats(data)
    .filter((s) => s.salesChange !== null && s.salesChange <= -RULES.sellingLessDropPct)
    .sort((a, b) => (a.salesChange ?? 0) - (b.salesChange ?? 0));
}

export function runningLow(data: Dataset): ProductStats[] {
  return allProductStats(data).filter((s) => s.status === "running-low").sort(byDaysLeft);
}

export function lowStock(data: Dataset): ProductStats[] {
  return allProductStats(data).filter((s) => s.status === "low-stock").sort(byDaysLeft);
}

/** Running low and low stock together, soonest to run out first. */
export function needsOrdering(data: Dataset): ProductStats[] {
  return allProductStats(data)
    .filter((s) => s.status === "running-low" || s.status === "low-stock")
    .sort(byDaysLeft);
}

export function overstocked(data: Dataset): ProductStats[] {
  return allProductStats(data).filter((s) => s.status === "overstocked").sort(byStockValue);
}

/** Very few sales in the last 60 days (but at least one sale in the last 90). */
export function slowProducts(data: Dataset): ProductStats[] {
  return allProductStats(data).filter((s) => s.status === "slow").sort(byStockValue);
}

/** No sales for at least `days` days, with stock on the shelf. */
export function noSales(data: Dataset, days: number = RULES.noSalesDays): ProductStats[] {
  return allProductStats(data)
    .filter((s) => s.product.stock > 0 && (s.lastSaleDaysAgo === null || s.lastSaleDaysAgo >= days))
    .sort(byStockValue);
}

export function costIncreases(data: Dataset): ProductStats[] {
  return allProductStats(data)
    .filter((s) => s.costChange?.costIncreased)
    .sort((a, b) => (b.costChange?.changePct ?? 0) - (a.costChange?.changePct ?? 0));
}

export function profitDrops(data: Dataset): ProductStats[] {
  return allProductStats(data)
    .filter((s) => s.costChange?.profitDropped)
    .sort((a, b) => (b.costChange?.changePct ?? 0) - (a.costChange?.changePct ?? 0));
}

export function stockValue(data: Dataset): number {
  return data.products.reduce((total, p) => total + p.stock * p.cost, 0);
}

/** Everything the Home page needs, computed once per dataset. */
export function getOverview(data: Dataset): Overview {
  const cached = overviewCache.get(data);
  if (cached) return cached;

  const { days } = buildIndex(data);
  const todayTotals = days[0];
  const lastWeekSameDay = days[7]?.sales ?? 0;
  const slow = slowProducts(data);
  const dead = noSales(data);
  const overview: Overview = {
    today: data.today,
    salesToday: todayTotals.sales,
    profitToday: todayTotals.profit,
    ordersToday: todayTotals.orders,
    salesSameDayLastWeek: lastWeekSameDay,
    todayVsLastWeek: changeRatio(todayTotals.sales, lastWeekSameDay),
    week: periodTotals(data, 7),
    previousWeek: periodTotals(data, 7, 7),
    month: periodTotals(data, 30),
    previousMonth: periodTotals(data, 30, 30),
    stockValue: stockValue(data),
    runningLow: runningLow(data),
    lowStock: lowStock(data),
    slow,
    noSales: dead,
    overstocked: overstocked(data),
    slowValue: slow.reduce((t, s) => t + s.stockValue, 0),
    noSalesValue: dead.reduce((t, s) => t + s.stockValue, 0),
    costIncreases: costIncreases(data),
    profitDrops: profitDrops(data),
    sellingLess: sellingLess(data),
    bestSellers: bestSellers(data, 5),
  };
  overviewCache.set(data, overview);
  return overview;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/** Name / code / barcode / brand search. Every word of the query must match. */
export function searchProducts(data: Dataset, query: string): ProductStats[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const stats = allProductStats(data);
  if (words.length === 0) return [...stats].sort(byRevenue);
  return stats
    .filter((s) => {
      const haystack = `${s.product.name} ${s.product.code} ${s.product.barcode} ${s.product.brand} ${s.product.category}`.toLowerCase();
      return words.every((w) => haystack.includes(w));
    })
    .sort(byRevenue);
}
