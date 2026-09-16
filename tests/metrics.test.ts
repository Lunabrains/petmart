import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Dataset } from "../src/lib/data/types";
import {
  allProductStats,
  changeRatio,
  dailySeries,
  getOverview,
  getProductStats,
  periodTotals,
  productCostHistory,
  productSalesHistory,
  searchProducts,
  sellingLess,
} from "../src/lib/metrics";

/** A tiny hand-made dataset where every number can be checked by hand. */
function tiny(): Dataset {
  const today = "2026-09-16";
  return {
    today,
    brands: ["A"],
    categories: ["Food"],
    suppliers: ["S1"],
    products: [
      { id: "P1", code: "A-1", barcode: "1", name: "Fast Food 10kg", brand: "A", category: "Food", supplier: "S1", cost: 10, price: 15, stock: 20 },
      { id: "P2", code: "A-2", barcode: "2", name: "Dead Stock", brand: "A", category: "Food", supplier: "S1", cost: 5, price: 9, stock: 50 },
      { id: "P3", code: "A-3", barcode: "3", name: "Pricier Now", brand: "A", category: "Food", supplier: "S1", cost: 56, price: 68, stock: 100 },
      { id: "P4", code: "A-4", barcode: "4", name: "Price Followed", brand: "A", category: "Food", supplier: "S1", cost: 54, price: 75, stock: 100 },
    ],
    sales: [
      // P1 sells 4 a day for the last 30 days (120 units) and 8 a day the 30 days before (240 units).
      ...Array.from({ length: 30 }, (_, d) => ({ id: `s1-${d}`, date: daysAgo(today, d), orderId: `o-${d}`, productId: "P1", quantity: 4, price: 15, cost: 10 })),
      ...Array.from({ length: 30 }, (_, d) => ({ id: `s1b-${d}`, date: daysAgo(today, 30 + d), orderId: `o-${30 + d}`, productId: "P1", quantity: 8, price: 15, cost: 10 })),
      // P2 last sold 100 days ago.
      { id: "s2", date: daysAgo(today, 100), orderId: "o-100", productId: "P2", quantity: 1, price: 9, cost: 5 },
      // P3 sold at 68 before and after its cost went up.
      { id: "s3a", date: daysAgo(today, 20), orderId: "o-20", productId: "P3", quantity: 2, price: 68, cost: 50 },
      { id: "s3b", date: daysAgo(today, 2), orderId: "o-2", productId: "P3", quantity: 2, price: 68, cost: 56 },
      // P4 sold at 70 before the cost went up, at 75 after.
      { id: "s4a", date: daysAgo(today, 20), orderId: "o-20", productId: "P4", quantity: 2, price: 70, cost: 50 },
      { id: "s4b", date: daysAgo(today, 2), orderId: "o-2", productId: "P4", quantity: 2, price: 75, cost: 54 },
    ],
    purchases: [
      { id: "b1", date: daysAgo(today, 40), productId: "P1", supplier: "S1", quantity: 100, cost: 10 },
      { id: "b3a", date: daysAgo(today, 40), productId: "P3", supplier: "S1", quantity: 100, cost: 50 },
      { id: "b3b", date: daysAgo(today, 10), productId: "P3", supplier: "S1", quantity: 100, cost: 56 },
      { id: "b4a", date: daysAgo(today, 40), productId: "P4", supplier: "S1", quantity: 100, cost: 50 },
      { id: "b4b", date: daysAgo(today, 10), productId: "P4", supplier: "S1", quantity: 100, cost: 54 },
    ],
  };
}

function daysAgo(today: string, n: number): string {
  const d = new Date(`${today}T12:00:00`);
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe("metrics", () => {
  const data = tiny();

  it("sums sales and profit for a period, and counts orders", () => {
    const month = periodTotals(data, 30);
    // P1: 120 units x $15; P3: 2 x 68 twice; P4: 2 x 70 then 2 x 75, all inside the last 30 days.
    assert.equal(month.sales, 120 * 15 + 4 * 68 + 2 * 70 + 2 * 75);
    assert.equal(month.profit, 120 * 5 + 2 * (68 - 50) + 2 * (68 - 56) + 2 * (70 - 50) + 2 * (75 - 54));
    assert.equal(month.units, 128);
    assert.equal(month.orders, 30); // o-0..o-29 (P3/P4 share o-2 and o-20)
    const before = periodTotals(data, 30, 30);
    assert.equal(before.sales, 240 * 15);
    assert.equal(before.avgOrder, 240 * 15 / 30);
  });

  it("builds a daily series oldest first, ending today", () => {
    const series = dailySeries(data, 7);
    assert.equal(series.length, 7);
    assert.equal(series[6].date, data.today);
    assert.equal(series[6].sales, 4 * 15);
    assert.equal(series[0].daysAgo, 6);
  });

  it("computes average daily sales, days left and stock value", () => {
    const s = getProductStats(data, "P1")!;
    assert.equal(s.units30, 120);
    assert.equal(s.unitsPrev30, 240);
    assert.equal(s.avgDaily, 4);
    assert.equal(s.daysLeft, 5);
    assert.equal(s.stockValue, 200);
    assert.equal(s.lastSaleDaysAgo, 0);
    assert.equal(s.status, "running-low");
    assert.equal(s.salesChange, -0.5);
    assert.ok(sellingLess(data).some((x) => x.product.id === "P1"));
  });

  it("flags products with no sales for 90 days", () => {
    const s = getProductStats(data, "P2")!;
    assert.equal(s.lastSaleDaysAgo, 100);
    assert.equal(s.daysLeft, null);
    assert.equal(s.status, "no-sales");
  });

  it("detects a cost increase with the price unchanged as a profit drop", () => {
    const s = getProductStats(data, "P3")!;
    const c = s.costChange!;
    assert.equal(c.previousCost, 50);
    assert.equal(c.currentCost, 56);
    assert.ok(Math.abs(c.changePct - 0.12) < 1e-9);
    assert.equal(c.previousPrice, 68);
    assert.equal(c.priceChanged, false);
    assert.equal(c.costIncreased, true);
    assert.equal(c.profitDropped, true);
    assert.equal(c.profitPerUnitBefore, 18);
    assert.equal(c.profitPerUnitNow, 12);
  });

  it("does not call it a profit drop when the price followed the cost", () => {
    const c = getProductStats(data, "P4")!.costChange!;
    assert.equal(c.previousPrice, 70);
    assert.equal(c.currentPrice, 75);
    assert.equal(c.priceChanged, true);
    assert.equal(c.costIncreased, true);
    assert.equal(c.profitDropped, false);
  });

  it("returns product history oldest first", () => {
    const history = productSalesHistory(data, "P1", 10);
    assert.equal(history.length, 10);
    assert.equal(history[9].date, data.today);
    assert.equal(history[9].units, 4);
    const cost = productCostHistory(data, "P3");
    assert.deepEqual(cost.map((p) => p.cost), [50, 56]);
  });

  it("searches by name, code, barcode and brand, all words required", () => {
    assert.deepEqual(searchProducts(data, "fast 10kg").map((s) => s.product.id), ["P1"]);
    assert.deepEqual(searchProducts(data, "A-2").map((s) => s.product.id), ["P2"]);
    assert.deepEqual(searchProducts(data, "3").map((s) => s.product.id).sort(), ["P3"]);
    assert.equal(searchProducts(data, "").length, 4);
    assert.equal(searchProducts(data, "nothing here").length, 0);
  });

  it("overview counts match the lists", () => {
    const o = getOverview(data);
    assert.equal(o.salesToday, 60);
    assert.equal(o.profitToday, 20);
    assert.equal(o.salesSameDayLastWeek, 60);
    assert.equal(o.todayVsLastWeek, 0);
    assert.equal(o.stockValue, 20 * 10 + 50 * 5 + 100 * 56 + 100 * 54);
    assert.equal(o.runningLow.length, 1);
    assert.equal(o.noSales.length, 1);
    assert.equal(o.profitDrops.length, 1);
    assert.equal(o.costIncreases.length, 2);
    assert.equal(allProductStats(data).length, 4);
  });

  it("changeRatio handles a zero base", () => {
    assert.equal(changeRatio(10, 0), null);
    assert.equal(changeRatio(12, 10), 0.2);
  });
});
