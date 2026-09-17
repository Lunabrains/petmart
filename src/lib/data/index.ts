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

let base: { today: string; data: Dataset } | null = null;
const batches: ImportBatch[] = [];
let merged: { key: string; data: Dataset } | null = null;

/** The generated demo data for today, without imports. */
export function getBaseData(): Dataset {
  const today = todayISO();
  if (!base || base.today !== today) {
    base = { today, data: generateDemo(today) };
    merged = null;
  }
  return base.data;
}

/** The dataset "as of" today: demo data plus every confirmed import. */
export function getData(): Dataset {
  const baseData = getBaseData();
  const key = `${baseData.today}:${batches.map((b) => b.id).join(",")}`;
  if (!merged || merged.key !== key) merged = { key, data: applyImports(baseData, batches) };
  return merged.data;
}

export function addImportBatch(batch: ImportBatch): void {
  batches.push(batch);
  merged = null;
}

export function resetImports(): void {
  batches.length = 0;
  merged = null;
}

export function listImportBatches(): ImportBatchSummary[] {
  return batches
    .map((b) => ({ id: b.id, at: b.at, fileName: b.fileName, documentType: b.documentType, products: b.products.length, sales: b.sales.length, purchases: b.purchases.length }))
    .reverse();
}
