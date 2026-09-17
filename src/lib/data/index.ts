import { format } from "date-fns";

import { applyImports } from "../imports/apply";
import type { ImportBatch, ImportBatchSummary } from "../imports/types";
import { generateDemo } from "./demo";
import type { Dataset } from "./types";

export type * from "./types";

/**
 * Where the dashboard gets its numbers.
 *
 * Today: generated demo data, plus whatever the owner added through Import
 * (kept in memory for the demo). Phase 7: replace `generateDemo` with a
 * loader that reads Wizzard's export / API / read-only database into the
 * same `Dataset` shape. Nothing else in the app needs to change, and nothing
 * is ever written back to Wizzard.
 */

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

interface Store {
  base: { today: string; data: Dataset } | null;
  batches: ImportBatch[];
  merged: { key: string; data: Dataset } | null;
}

// One store per server process. It hangs off globalThis because in development
// each route gets its own copy of this module; the API route that adds an
// import and the page that shows it must see the same imports.
const globalStore = globalThis as typeof globalThis & { __petmartStore?: Store };
const store: Store = (globalStore.__petmartStore ??= { base: null, batches: [], merged: null });

/** The generated demo data for today, without imports. */
export function getBaseData(): Dataset {
  const today = todayISO();
  if (!store.base || store.base.today !== today) {
    store.base = { today, data: generateDemo(today) };
    store.merged = null;
  }
  return store.base.data;
}

/** The dataset "as of" today: demo data plus every confirmed import. */
export function getData(): Dataset {
  const baseData = getBaseData();
  const key = `${baseData.today}:${store.batches.map((b) => b.id).join(",")}`;
  if (!store.merged || store.merged.key !== key) store.merged = { key, data: applyImports(baseData, store.batches) };
  return store.merged.data;
}

export function addImportBatch(batch: ImportBatch): void {
  store.batches.push(batch);
  store.merged = null;
}

export function resetImports(): void {
  store.batches.length = 0;
  store.merged = null;
}

export function listImportBatches(): ImportBatchSummary[] {
  return store.batches
    .map((b) => ({ id: b.id, at: b.at, fileName: b.fileName, documentType: b.documentType, products: b.products.length, sales: b.sales.length, purchases: b.purchases.length }))
    .reverse();
}
