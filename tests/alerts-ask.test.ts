import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseAlertStatuses, pruneStatuses, serializeAlertStatuses, statusOf, withStatus } from "../src/lib/alert-status";
import { alertsForProduct, buildAlerts } from "../src/lib/alerts";
import { askQuestion, detectIntent, SUGGESTED_QUESTIONS } from "../src/lib/ask";
import { DEMO_CASES, generateDemo } from "../src/lib/data/demo";
import { getOverview } from "../src/lib/metrics";

const data = generateDemo("2026-09-16");

describe("alerts", () => {
  const alerts = buildAlerts(data);

  it("cover stock, sales and profit with stable ids", () => {
    for (const category of ["stock", "sales", "profit"] as const) assert.ok(alerts.some((a) => a.category === category), category);
    assert.equal(new Set(alerts.map((a) => a.id)).size, alerts.length);
    assert.deepEqual(buildAlerts(generateDemo("2026-09-16")).map((a) => a.id), alerts.map((a) => a.id));
  });

  it("puts red alerts first and never use technical words", () => {
    const firstOrange = alerts.findIndex((a) => a.level === "orange");
    const lastRed = alerts.map((a) => a.level).lastIndexOf("red");
    assert.ok(lastRed < firstOrange);
    for (const a of alerts) {
      assert.doesNotMatch(a.message, /undefined|NaN|null|Infinity/);
      assert.doesNotMatch(a.message, /\b(sku|kpi|sql|api|threshold|algorithm)\b/i);
    }
  });

  it("match the home page counts", () => {
    const o = getOverview(data);
    assert.equal(alerts.filter((a) => a.rule === "running-low").length, o.runningLow.length);
    assert.equal(alerts.filter((a) => a.rule === "profit-drop").length, o.profitDrops.length);
    assert.equal(alerts.filter((a) => a.rule === "cost-increase").length, o.costIncreases.length);
    assert.equal(alerts.filter((a) => a.rule === "slow").length, o.slow.length);
    assert.equal(alerts.filter((a) => a.rule === "no-sales").length, o.noSales.length);
  });

  it("explain the cost-increase example the way the brief does", () => {
    const product = data.products.find((p) => p.name === DEMO_CASES.costIncreaseExample)!;
    const mine = alertsForProduct(data, product.id);
    const drop = mine.find((a) => a.rule === "profit-drop")!;
    assert.ok(drop, "profit drop alert exists");
    assert.match(drop.message, /\$48\.00/);
    assert.match(drop.message, /\$54\.00/);
    assert.match(drop.message, /\$65\.00/);
    assert.ok(mine.some((a) => a.rule === "cost-increase"));
  });
});

describe("alert statuses", () => {
  it("round-trip through the cookie and default to new", () => {
    let map = parseAlertStatuses(undefined);
    assert.equal(statusOf(map, "x"), "new");
    map = withStatus(map, "a", "seen");
    map = withStatus(map, "b", "done");
    map = withStatus(map, "a", "done");
    const raw = serializeAlertStatuses(map);
    const back = parseAlertStatuses(raw);
    assert.equal(statusOf(back, "a"), "done");
    assert.equal(statusOf(back, "b"), "done");
    assert.equal(statusOf(withStatus(back, "a", "new"), "a"), "new");
    assert.deepEqual(pruneStatuses(back, new Set(["a"])), { seen: [], done: ["a"] });
    assert.deepEqual(parseAlertStatuses("not json"), { seen: [], done: [] });
  });
});

describe("ask", () => {
  it("understands every suggested question", () => {
    const expected = ["attention", "bestSellers", "order", "notSelling", "profit", "order", "salesSummary"];
    SUGGESTED_QUESTIONS.forEach((q, i) => assert.equal(detectIntent(q), expected[i], q));
  });

  it("answers with real numbers only", () => {
    const o = getOverview(data);
    const a = askQuestion("What should I look at today?", data);
    assert.match(a.title, /Need/);
    assert.ok(a.lines.some((l) => l.includes(`${o.runningLow.length} products are running low`)), a.lines.join("\n"));
    const best = askQuestion("What are my best sellers?", data);
    assert.equal(best.lines.length, 5);
    assert.ok(best.lines[0].includes(o.bestSellers[0].product.name));
    for (const q of SUGGESTED_QUESTIONS) {
      const answer = askQuestion(q, data);
      assert.ok(answer.lines.length > 0, q);
      for (const line of answer.lines) assert.doesNotMatch(line, /undefined|NaN|null|Infinity/);
    }
  });

  it("answers about a product by name and falls back politely", () => {
    const a = askQuestion(`How is ${DEMO_CASES.topSellerRunningLow} doing?`, data);
    assert.equal(a.title, DEMO_CASES.topSellerRunningLow);
    assert.ok(a.lines.some((l) => /running low/i.test(l)));
    const unknown = askQuestion("Tell me a joke", data);
    assert.equal(unknown.lines.length, SUGGESTED_QUESTIONS.length);
  });
});
