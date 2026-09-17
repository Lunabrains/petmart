import type { Product } from "../data/types";

/**
 * Finding the product a file line talks about: by code, by barcode, or by
 * name (exact first, then the longest product name the text contains).
 */

/** Product codes look like "RC-DF-033" or "PM-OWN-1". */
export const CODE_RE = /\b[A-Z]{2,4}-[A-Z]{2,4}-\d{1,5}\b/;

export interface ProductIndex {
  byCode: Map<string, Product>;
  byBarcode: Map<string, Product>;
  byName: Map<string, Product>;
  /** Longest names first so "Bird Cage XL" wins over "Bird Cage". */
  names: Array<{ key: string; product: Product }>;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export function indexProducts(products: Product[]): ProductIndex {
  const byCode = new Map<string, Product>();
  const byBarcode = new Map<string, Product>();
  const byName = new Map<string, Product>();
  for (const p of products) {
    if (p.code) byCode.set(norm(p.code), p);
    if (p.barcode) byBarcode.set(p.barcode.trim(), p);
    byName.set(norm(p.name), p);
  }
  const names = products.map((product) => ({ key: norm(product.name), product })).sort((a, b) => b.key.length - a.key.length);
  return { byCode, byBarcode, byName, names };
}

/** A reference typed in a cell: code, barcode or name. */
export function findProduct(index: ProductIndex, ref: string): Product | undefined {
  const key = norm(ref);
  if (!key) return undefined;
  return index.byCode.get(key) ?? index.byBarcode.get(key) ?? index.byName.get(key) ?? findProductInText(index, ref)?.product;
}

export interface TextMatch {
  product: Product;
  /** The part of the text that named the product, so the rest can be parsed for numbers. */
  matched: string;
}

/** A line of free text, e.g. "RC-DF-033 Royal Canin Maxi Adult 15kg 60 62.00 3720.00". */
export function findProductInText(index: ProductIndex, text: string): TextMatch | undefined {
  const code = text.match(CODE_RE);
  if (code) {
    const product = index.byCode.get(norm(code[0]));
    if (product) return { product, matched: code[0] };
  }
  const barcode = text.match(/\b\d{12,14}\b/);
  if (barcode) {
    const product = index.byBarcode.get(barcode[0]);
    if (product) return { product, matched: barcode[0] };
  }
  const key = norm(text);
  for (const entry of index.names) {
    if (key.includes(entry.key)) {
      const at = key.indexOf(entry.key);
      return { product: entry.product, matched: text.trim().replace(/\s+/g, " ").slice(at, at + entry.key.length) };
    }
  }
  return undefined;
}
