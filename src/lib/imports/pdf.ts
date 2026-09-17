import { extractText, getDocumentProxy } from "unpdf";

import type { Product } from "../data/types";
import { CODE_RE, findProductInText, indexProducts, type ProductIndex } from "./match";
import type { ImportPreview } from "./types";
import { findDateInText, toNumber } from "./values";

/**
 * PDFs from suppliers and from Wizzard: delivery notes and invoices (product,
 * quantity, unit cost), sales reports (product, quantity, selling price) and
 * price lists (product, new cost). We read the text, find the lines that name
 * a product we know, and take the numbers that follow.
 */

export type PdfDocumentKind = "purchases" | "sales" | "products";

export function detectDocumentKind(text: string): { kind: PdfDocumentKind; label: string } {
  const t = text.toLowerCase();
  if (/price list|pricelist|new prices|cost list/.test(t)) return { kind: "products", label: "Price list" };
  if (/sales report|daily sales|sales summary|sold|till report|z report|receipt/.test(t)) return { kind: "sales", label: "Sales report" };
  if (/delivery note|delivery|invoice|purchase order|goods received|packing list|supplier/.test(t)) return { kind: "purchases", label: "Supplier invoice" };
  return { kind: "purchases", label: "Supplier document" };
}

function findSupplier(text: string, suppliers: string[]): string | undefined {
  const t = text.toLowerCase();
  const known = suppliers.find((s) => t.includes(s.toLowerCase()));
  if (known) return known;
  const labelled = text.match(/(?:supplier|from|vendor)\s*[:\-]\s*([^\n]{3,60})/i);
  return labelled?.[1]?.trim();
}

/**
 * Numbers written after the product on its line: "60 62.00 3,720.00" → [60, 62, 3720].
 * Sizes glued to letters ("15kg", "12x85g", "3-pack") and the product name itself are ignored.
 */
function numbersAfter(line: string, matched: string, productName: string): number[] {
  let rest = line;
  const at = line.indexOf(matched);
  if (at >= 0) rest = line.slice(at + matched.length);
  const nameAt = rest.toLowerCase().indexOf(productName.toLowerCase());
  if (nameAt >= 0) rest = rest.slice(nameAt + productName.length);
  const tokens = rest.match(/(?<![\w.,-])-?\d[\d,]*(?:\.\d+)?(?![\w])/g) ?? [];
  return tokens.map((t) => toNumber(t)).filter((n): n is number => n !== undefined);
}

/** Break the text into candidate lines; a product code always starts a new one. */
function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .flatMap((line) => line.split(new RegExp(`(?=${CODE_RE.source})`)))
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export async function pdfToText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

export function parsePdfText(text: string, fileName: string, products: Product[], suppliers: string[], today: string): ImportPreview {
  const index: ProductIndex = indexProducts(products);
  const { kind, label } = detectDocumentKind(text);
  const date = findDateInText(text) ?? today;
  const supplier = kind === "purchases" ? findSupplier(text, suppliers) : undefined;
  const preview: ImportPreview = { fileName, fileType: "pdf", documentType: label, products: [], sales: [], purchases: [], skipped: [], notes: [] };
  preview.notes.push(`Read as a ${label.toLowerCase()} dated ${date}.`);
  if (supplier) preview.notes.push(`Supplier: ${supplier}.`);

  const seenLines = new Set<string>();
  for (const line of splitLines(text)) {
    const match = findProductInText(index, line);
    if (!match) continue;
    if (seenLines.has(line)) continue;
    seenLines.add(line);
    const product = match.product;
    const numbers = numbersAfter(line, match.matched, product.name).filter((n) => n >= 0);
    if (kind === "products") {
      const [cost, price] = numbers;
      if (cost === undefined) {
        preview.skipped.push({ line, reason: "No cost after the product name." });
        continue;
      }
      preview.products.push({ code: product.code, name: product.name, cost, ...(price !== undefined ? { price } : {}) });
      continue;
    }
    // Quantity is a whole number; the unit amount follows it. A trailing line total is ignored.
    const qtyIndex = numbers.findIndex((n) => Number.isInteger(n) && n > 0 && n < 100_000);
    const quantity = qtyIndex >= 0 ? numbers[qtyIndex] : undefined;
    const unit = qtyIndex >= 0 ? numbers[qtyIndex + 1] : undefined;
    if (quantity === undefined) {
      preview.skipped.push({ line, reason: "No quantity after the product name." });
      continue;
    }
    if (kind === "sales") {
      preview.sales.push({ date, productRef: product.code, productId: product.id, productName: product.name, quantity, ...(unit !== undefined ? { price: unit } : {}) });
    } else {
      if (unit === undefined) {
        preview.skipped.push({ line, reason: "No unit cost after the quantity." });
        continue;
      }
      preview.purchases.push({ date, productRef: product.code, productId: product.id, productName: product.name, quantity, cost: unit, ...(supplier ? { supplier } : {}) });
    }
  }

  if (preview.products.length + preview.sales.length + preview.purchases.length === 0) {
    preview.skipped.push({ line: fileName, reason: "No line in this PDF named a product we know. Lines need a product code or the exact product name, then the quantity and the unit amount." });
  }
  return preview;
}

export async function parsePdf(bytes: Uint8Array, fileName: string, products: Product[], suppliers: string[], today: string): Promise<ImportPreview> {
  const text = await pdfToText(bytes);
  return parsePdfText(text, fileName, products, suppliers, today);
}
