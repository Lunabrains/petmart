import { format, parseISO } from "date-fns";

const money0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const money2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const number0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const number1 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

/** Whole dollars for totals: "$24,850". */
export function formatMoney(value: number): string {
  return money0.format(Math.round(value));
}

/** Unit prices and costs: "$48.00", "$1.60". */
export function formatPrice(value: number): string {
  return money2.format(value);
}

/** "$684k", "$1.2M" for tight spaces. */
export function formatMoneyCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 10_000) return `$${Math.round(value / 1_000)}k`;
  return money0.format(Math.round(value));
}

export function formatNumber(value: number): string {
  return number0.format(value);
}

export function formatNumber1(value: number): string {
  return number1.format(value);
}

/** 0.37 → "37%". */
export function formatPercent(ratio: number, digits = 0): string {
  return `${(Math.abs(ratio) * 100).toFixed(digits)}%`;
}

/** 0.08 → "+8%", -0.12 → "-12%". */
export function formatSignedPercent(ratio: number, digits = 0): string {
  const sign = ratio > 0 ? "+" : ratio < 0 ? "-" : "";
  return `${sign}${(Math.abs(ratio) * 100).toFixed(digits)}%`;
}

export function formatDate(iso: string): string {
  return format(parseISO(iso), "MMM d, yyyy");
}

export function formatDateShort(iso: string): string {
  return format(parseISO(iso), "d MMM");
}

/** 0 → "today", 1 → "yesterday", 42 → "42 days ago". */
export function formatDaysAgo(days: number | null): string {
  if (days === null) return "No sales recorded";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

/** Estimated days of stock: "Around 5 days", "Less than a day", "More than a year". */
export function formatDaysLeft(days: number | null): string {
  if (days === null) return "No recent sales";
  if (days < 1) return "Less than a day";
  if (days > 365) return "More than a year";
  if (days >= 60) return `Around ${Math.round(days / 30)} months`;
  return `Around ${Math.round(days)} days`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

/** "5 per day", "0.3 per day". */
export function formatPerDay(units: number): string {
  return `${units >= 10 ? formatNumber(units) : formatNumber1(units)} per day`;
}
