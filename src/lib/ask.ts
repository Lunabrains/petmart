import type { Dataset } from "./data/types";
import { formatDaysAgo, formatDaysLeft, formatMoney, formatNumber, formatPercent, formatPrice, formatSignedPercent, pluralize } from "./format";
import { allProductStats, getOverview, type ProductStats } from "./metrics";

/**
 * "Ask About Your Business": answers come straight from the same numbers the
 * screens show. There is no language model and nothing is ever invented; a
 * question we do not understand gets the list of questions we can answer.
 */

export interface Answer {
  title: string;
  lines: string[];
  link?: { label: string; href: string };
  /** Small print under the answer, e.g. what period the numbers cover. */
  note?: string;
}

export const SUGGESTED_QUESTIONS = [
  "What should I look at today?",
  "What are my best sellers?",
  "What products should I order?",
  "What products are not selling?",
  "Where am I losing profit?",
  "What products are running low?",
  "What happened to my sales this month?",
] as const;

type Intent = "attention" | "bestSellers" | "order" | "notSelling" | "profit" | "salesSummary" | "stockValue";

/** Phrases score 2, single words score 1; the highest total wins (earlier entries win ties). */
const INTENT_KEYWORDS: Record<Intent, string[]> = {
  attention: ["look at", "attention", "focus", "priorit", "what needs", "start with", "today", "worry", "problems", "issues"],
  bestSellers: ["best", "top", "most", "selling the most", "popular", "winners", "fastest"],
  order: ["order", "running low", "running out", "run out", "low stock", "restock", "reorder", "out of stock", "buy", "running short"],
  notSelling: ["not selling", "slow", "no sales", "dead", "sitting", "stuck", "not moving", "selling less", "isn't selling", "aren't selling", "not sold", "worst", "dropped"],
  profit: ["profit", "losing", "margin", "cost increase", "supplier cost", "cost went up", "losing money", "cost increased", "expensive"],
  stockValue: ["stock value", "inventory value", "how much stock", "my stock", "stock worth", "stock is worth", "inventory", "worth", "tied up"],
  salesSummary: ["sales", "revenue", "sold", "happened", "this month", "this week", "how much", "turnover", "selling"],
};

export function detectIntent(question: string): Intent | null {
  const q = question.toLowerCase();
  let best: Intent | null = null;
  let bestScore = 0;
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as Array<[Intent, string[]]>) {
    let score = 0;
    for (const keyword of keywords) if (q.includes(keyword)) score += keyword.includes(" ") ? 2 : 1;
    if (score > bestScore) {
      bestScore = score;
      best = intent;
    }
  }
  return best;
}

function findProduct(question: string, data: Dataset): ProductStats | null {
  const q = question.toLowerCase();
  const stats = allProductStats(data);
  let match: ProductStats | null = null;
  for (const s of stats) {
    const name = s.product.name.toLowerCase();
    if (q.includes(name) || q.includes(s.product.code.toLowerCase()) || q.includes(s.product.barcode)) {
      if (!match || name.length > match.product.name.length) match = s;
    }
  }
  return match;
}

const names = (list: ProductStats[], limit: number) => list.slice(0, limit).map((s) => s.product.name);

export function askQuestion(question: string, data: Dataset): Answer {
  const product = findProduct(question, data);
  if (product) return productAnswer(product);

  const o = getOverview(data);
  switch (detectIntent(question)) {
    case "attention":
      return attentionAnswer(data);
    case "bestSellers":
      return {
        title: "Your Best Sellers",
        lines: o.bestSellers.map((s, i) => `${i + 1}. ${s.product.name}: ${formatNumber(s.units30)} sold, ${formatMoney(s.revenue30)} in sales, ${formatMoney(s.profit30)} profit.`),
        note: "Last 30 days.",
        link: { label: "See Sales", href: "/sales" },
      };
    case "order": {
      const list = [...o.runningLow, ...o.lowStock];
      if (list.length === 0) return { title: "Nothing Is Running Low", lines: ["Every product has more than 14 days of stock at current sales."], link: { label: "See Stock", href: "/stock" } };
      return {
        title: `${pluralize(o.runningLow.length, "Product")} Running Low`,
        lines: [
          ...o.runningLow.slice(0, 6).map((s) => `${s.product.name}: ${s.product.stock} left, ${formatDaysLeft(s.daysLeft).toLowerCase()}.`),
          ...(o.runningLow.length > 6 ? [`And ${o.runningLow.length - 6} more.`] : []),
          ...(o.lowStock.length ? [`${pluralize(o.lowStock.length, "more product")} will need ordering within two weeks.`] : []),
        ],
        link: { label: "See Products", href: "/stock" },
      };
    }
    case "notSelling": {
      const lines: string[] = [];
      if (o.sellingLess.length) lines.push(`${pluralize(o.sellingLess.length, "product")} sold noticeably less than the month before: ${names(o.sellingLess, 3).join(", ")}.`);
      lines.push(`${formatMoney(o.slowValue)} is sitting in ${pluralize(o.slow.length, "slow product")}: ${names(o.slow, 3).join(", ")}.`);
      lines.push(`${pluralize(o.noSales.length, "product")} had no sales for 90 days, worth ${formatMoney(o.noSalesValue)}: ${names(o.noSales, 3).join(", ")}.`);
      return { title: "Products That Are Not Selling", lines, link: { label: "See Stock", href: "/stock" } };
    }
    case "profit": {
      const lines: string[] = [];
      if (o.profitDrops.length === 0 && o.costIncreases.length === 0) lines.push("No supplier cost increases were found. Profit per product is holding.");
      for (const s of o.profitDrops.slice(0, 5)) {
        const c = s.costChange!;
        lines.push(`${s.product.name}: cost up ${formatPercent(c.changePct)} (${formatPrice(c.previousCost)} to ${formatPrice(c.currentCost)}), price still ${formatPrice(c.currentPrice)}.`);
      }
      if (o.profitDrops.length > 5) lines.push(`And ${o.profitDrops.length - 5} more.`);
      return {
        title: o.profitDrops.length ? `Profit Dropped on ${pluralize(o.profitDrops.length, "Product")}` : "Profit Is Holding",
        lines,
        note: o.profitDrops.length ? "Supplier costs went up but selling prices stayed the same. Review these prices." : undefined,
        link: { label: "See Alerts", href: "/alerts?category=profit" },
      };
    }
    case "salesSummary": {
      const monthChange = o.previousMonth.sales > 0 ? (o.month.sales - o.previousMonth.sales) / o.previousMonth.sales : null;
      const weekChange = o.previousWeek.sales > 0 ? (o.week.sales - o.previousWeek.sales) / o.previousWeek.sales : null;
      return {
        title: "Your Sales",
        lines: [
          `Today: ${formatMoney(o.salesToday)} in sales, ${formatMoney(o.profitToday)} profit.`,
          `This week: ${formatMoney(o.week.sales)}${weekChange !== null ? ` (${formatSignedPercent(weekChange)} vs last week)` : ""}.`,
          `This month: ${formatMoney(o.month.sales)}${monthChange !== null ? ` (${formatSignedPercent(monthChange)} vs last month)` : ""}, ${pluralize(o.month.orders, "order")}, average order ${formatMoney(o.month.avgOrder)}.`,
          `Profit this month: ${formatMoney(o.month.profit)}.`,
          ...(o.sellingLess.length ? [`${pluralize(o.sellingLess.length, "product")} sold less than last month, led by ${names(o.sellingLess, 2).join(" and ")}.`] : []),
        ],
        note: "This month = last 30 days, compared with the 30 days before.",
        link: { label: "See Sales", href: "/sales" },
      };
    }
    case "stockValue":
      return {
        title: `Your Stock Is Worth ${formatMoney(o.stockValue)}`,
        lines: [
          `${formatMoney(o.slowValue)} of it is in slow products and ${formatMoney(o.noSalesValue)} in products with no sales for 90 days.`,
          `${pluralize(o.overstocked.length, "product")} has far more stock than it sells.`,
        ],
        link: { label: "See Stock", href: "/stock" },
      };
    default:
      return {
        title: "I Can Answer These Questions",
        lines: [...SUGGESTED_QUESTIONS],
        note: "You can also ask about a product by name, for example \"How is Royal Canin Maxi Adult 15kg doing?\"",
      };
  }
}

function attentionAnswer(data: Dataset): Answer {
  const o = getOverview(data);
  const lines: string[] = [];
  if (o.runningLow.length) lines.push(`${pluralize(o.runningLow.length, "product is", "products are")} running low. First: ${names(o.runningLow, 2).join(", ")}.`);
  if (o.slow.length) lines.push(`${formatMoney(o.slowValue)} is sitting in ${pluralize(o.slow.length, "slow product")}.`);
  if (o.costIncreases.length) lines.push(`Supplier costs increased on ${pluralize(o.costIncreases.length, "product")}.`);
  if (o.profitDrops.length) lines.push(`Profit dropped on ${pluralize(o.profitDrops.length, "product")} because costs went up and prices did not.`);
  if (o.noSales.length) lines.push(`${pluralize(o.noSales.length, "product")} had no sales for 90 days (${formatMoney(o.noSalesValue)} in stock).`);
  if (lines.length === 0) return { title: "Nothing Needs Your Attention", lines: ["Stock, sales and profit all look fine today."] };
  return {
    title: `${lines.length} ${lines.length === 1 ? "Thing Needs" : "Things Need"} Your Attention`,
    lines: lines.map((line, i) => `${i + 1}. ${line}`),
    link: { label: "See Alerts", href: "/alerts" },
  };
}

function productAnswer(s: ProductStats): Answer {
  const p = s.product;
  const lines = [
    `Selling price ${formatPrice(p.price)}, cost ${formatPrice(p.cost)}, profit ${formatPrice(s.profitPerUnit)} per unit (${formatPercent(s.margin)}).`,
    `${formatNumber(s.units30)} sold in the last 30 days, ${formatMoney(s.revenue30)} in sales.`,
    `${pluralize(p.stock, "unit")} in stock (${formatMoney(s.stockValue)}). ${formatDaysLeft(s.daysLeft)} of stock left. Last sale: ${formatDaysAgo(s.lastSaleDaysAgo).toLowerCase()}.`,
  ];
  if (s.costChange?.profitDropped) {
    const c = s.costChange;
    lines.push(`Supplier cost increased from ${formatPrice(c.previousCost)} to ${formatPrice(c.currentCost)} but the selling price stayed at ${formatPrice(c.currentPrice)}. Review the selling price.`);
  }
  if (s.status === "running-low") lines.push("It is running low. Order soon.");
  if (s.status === "slow") lines.push("It is selling slowly.");
  if (s.status === "no-sales") lines.push("It has not sold for 90 days.");
  if (s.status === "overstocked") lines.push("There is far more stock than it sells.");
  return { title: p.name, lines, link: { label: "Open Product", href: `/products/${p.id}` } };
}
