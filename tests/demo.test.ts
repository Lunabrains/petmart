import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEMO_CASES, DEMO_DAYS, generateDemo } from "../src/lib/data/demo";
import { bestSellers, costIncreases, getOverview, getProductStats, noSales, profitDrops, runningLow, slowProducts } from "../src/lib/metrics";

const TODAY = "2026-09-16";
const data = generateDemo(TODAY);
const byName = (name: string) => {
  const product = data.products.find((p) => p.name === name);
  assert.ok(product, `product ${name} exists`);
  return getProductStats(data, product.id)!;
};

describe("demo data", () => {
  it("meets the minimum sizes from the brief", () => {
    assert.ok(data.products.length >= 500, `${data.products.length} products`);
    assert.equal(data.brands.length, 10);
    assert.equal(data.categories.length, 10);
    assert.equal(data.suppliers.length, 10);
    assert.ok(DEMO_DAYS >= 90);
    const dates = new Set(data.sales.map((s) => s.date));
    assert.ok(dates.size >= 90, `${dates.size} days of sales`);
    assert.ok(dates.has(TODAY), "there are sales today");
  });

  it("is deterministic for the same day", () => {
    const again = generateDemo(TODAY);
    assert.equal(again.sales.length, data.sales.length);
    assert.deepEqual(again.products[0], data.products[0]);
    assert.deepEqual(again.sales[123], data.sales[123]);
  });

  it("uses every brand, category and supplier and has unique codes and barcodes", () => {
    for (const brand of data.brands) assert.ok(data.products.some((p) => p.brand === brand), brand);
    for (const category of data.categories) assert.ok(data.products.some((p) => p.category === category), category);
    for (const supplier of data.suppliers) assert.ok(data.products.some((p) => p.supplier === supplier), supplier);
    assert.equal(new Set(data.products.map((p) => p.code)).size, data.products.length);
    assert.equal(new Set(data.products.map((p) => p.barcode)).size, data.products.length);
    assert.equal(new Set(data.products.map((p) => p.name)).size, data.products.length);
  });

  it("keeps every sale and purchase pointing at a real product with sensible numbers", () => {
    const ids = new Set(data.products.map((p) => p.id));
    for (const s of data.sales) {
      assert.ok(ids.has(s.productId));
      assert.ok(s.quantity > 0 && s.price > 0 && s.cost > 0);
    }
    for (const p of data.purchases) {
      assert.ok(ids.has(p.productId));
      assert.ok(p.quantity > 0 && p.cost > 0);
    }
    for (const p of data.products) {
      assert.ok(p.price > p.cost, `${p.name} sells above cost`);
      assert.ok(p.stock >= 0);
    }
  });

  it("case 1: the top seller is almost out of stock", () => {
    const s = byName(DEMO_CASES.topSellerRunningLow);
    assert.equal(s.status, "running-low");
    assert.ok((s.daysLeft ?? 99) < 7, `days left ${s.daysLeft}`);
    assert.ok(bestSellers(data, 5).some((b) => b.product.id === s.product.id), "in the top 5 best sellers");
    assert.ok(runningLow(data).some((r) => r.product.id === s.product.id));
  });

  it("case 2: a product with a lot of stock and almost no sales", () => {
    const s = byName(DEMO_CASES.slowWithLotsOfStock);
    assert.equal(s.status, "slow");
    assert.equal(s.product.stock, 120);
    assert.equal(s.lastSaleDaysAgo, 42);
    assert.ok(s.stockValue > 3000);
    assert.ok(slowProducts(data).some((r) => r.product.id === s.product.id));
  });

  it("cases 3 and 4: supplier cost increased and profit dropped", () => {
    const s = byName(DEMO_CASES.costIncreaseExample);
    assert.ok(s.costChange, "has a cost change");
    assert.equal(s.costChange!.previousCost, 48);
    assert.equal(s.costChange!.currentCost, 54);
    assert.equal(s.costChange!.currentPrice, 65);
    assert.equal(s.costChange!.priceChanged, false);
    assert.equal(s.costChange!.costIncreased, true);
    assert.equal(s.costChange!.profitDropped, true);
    assert.ok(costIncreases(data).length >= 6, `${costIncreases(data).length} cost increases`);
    assert.ok(profitDrops(data).length >= 8, `${profitDrops(data).length} profit drops`);
    assert.ok(profitDrops(data).length > costIncreases(data).length - 3, "small rises count as profit drops too");
  });

  it("case 4 counter-example: raising the price with the cost is not a profit drop", () => {
    const raised = data.products
      .map((p) => getProductStats(data, p.id)!)
      .filter((s) => s.costChange?.costIncreased && s.costChange.priceChanged);
    assert.ok(raised.length >= 3, `${raised.length} products raised their price`);
    for (const s of raised) assert.equal(s.costChange!.profitDropped, false);
  });

  it("case 5: there are strong sellers", () => {
    const top = bestSellers(data, 5);
    assert.equal(top.length, 5);
    for (const s of top) assert.ok(s.revenue30 > 5000, `${s.product.name} sold ${s.revenue30}`);
  });

  it("case 6: a product with no sales for over 90 days", () => {
    const s = byName(DEMO_CASES.noSalesForMonths);
    assert.equal(s.status, "no-sales");
    assert.equal(s.lastSaleDaysAgo, 96);
    assert.equal(s.stockValue, 2800);
    assert.ok(noSales(data).some((r) => r.product.id === s.product.id));
  });

  it("shows every attention item on the home page immediately", () => {
    const o = getOverview(data);
    assert.ok(o.runningLow.length >= 8 && o.runningLow.length <= 20, `${o.runningLow.length} running low`);
    assert.ok(o.lowStock.length >= 4, `${o.lowStock.length} low stock`);
    assert.ok(o.slow.length >= 20, `${o.slow.length} slow`);
    assert.ok(o.noSales.length >= 15, `${o.noSales.length} no sales`);
    assert.ok(o.overstocked.length >= 6, `${o.overstocked.length} overstocked`);
    assert.ok(o.sellingLess.length >= 6, `${o.sellingLess.length} selling less`);
    assert.ok(o.salesToday > 10_000 && o.salesToday < 60_000, `sales today ${o.salesToday}`);
    assert.ok(o.profitToday > 0 && o.profitToday < o.salesToday);
    assert.ok(o.stockValue > 300_000 && o.stockValue < 1_500_000, `stock value ${o.stockValue}`);
  });
});
