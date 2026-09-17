import type { Dataset, Product, Purchase, Sale } from "../data/types";
import { findProduct, indexProducts } from "./match";
import type { ImportBatch, ImportPreview, ImportSummary } from "./types";

/**
 * Pure: the base dataset plus every confirmed import. Products are matched by
 * code, barcode or name; a delivery adds stock and becomes the latest cost; a
 * sale removes stock. The base data is never modified.
 */

const norm = (s: string) => s.trim().toLowerCase();

function importedProductId(n: number): string {
  return `N${String(n).padStart(4, "0")}`;
}

export function applyImports(base: Dataset, batches: ImportBatch[]): Dataset {
  if (batches.length === 0) return base;

  const products: Product[] = base.products.map((p) => ({ ...p }));
  const sales: Sale[] = [...base.sales];
  const purchases: Purchase[] = [...base.purchases];
  const brands = new Set(base.brands);
  const categories = new Set(base.categories);
  const suppliers = new Set(base.suppliers);

  const latestDelivery = new Map<string, string>();
  for (const p of purchases) {
    const current = latestDelivery.get(p.productId);
    if (!current || p.date > current) latestDelivery.set(p.productId, p.date);
  }

  let index = indexProducts(products);
  let newProducts = 0;
  let saleSeq = 0;
  let purchaseSeq = 0;

  for (const batch of batches) {
    for (const row of batch.products) {
      const existing = findProduct(index, row.code) ?? (row.barcode ? findProduct(index, row.barcode) : undefined) ?? findProduct(index, row.name);
      if (existing) {
        if (row.name && norm(row.name) !== norm(existing.name) && norm(row.code) === norm(existing.code)) existing.name = row.name;
        if (row.barcode) existing.barcode = row.barcode;
        if (row.brand) existing.brand = row.brand;
        if (row.category) existing.category = row.category;
        if (row.supplier) existing.supplier = row.supplier;
        if (row.cost !== undefined) existing.cost = row.cost;
        if (row.price !== undefined) existing.price = row.price;
        if (row.stock !== undefined) existing.stock = row.stock;
      } else {
        newProducts++;
        const cost = row.cost ?? (row.price !== undefined ? Math.round(row.price * 70) / 100 : 0);
        const price = row.price ?? (row.cost !== undefined ? Math.round(row.cost * 140) / 100 : 0);
        products.push({
          id: importedProductId(newProducts),
          code: row.code || `IMP-${String(newProducts).padStart(3, "0")}`,
          barcode: row.barcode ?? "",
          name: row.name || row.code,
          brand: row.brand ?? "Other",
          category: row.category ?? "Other",
          supplier: row.supplier ?? "Unknown supplier",
          cost,
          price,
          stock: row.stock ?? 0,
        });
      }
      if (row.brand) brands.add(row.brand);
      if (row.category) categories.add(row.category);
      if (row.supplier) suppliers.add(row.supplier);
      index = indexProducts(products);
    }

    for (const row of batch.purchases) {
      const product = (row.productId && products.find((p) => p.id === row.productId)) || findProduct(index, row.productRef);
      if (!product) continue;
      purchaseSeq++;
      const supplier = row.supplier ?? product.supplier;
      purchases.push({ id: `IB${String(purchaseSeq).padStart(5, "0")}`, date: row.date, productId: product.id, supplier, quantity: row.quantity, cost: row.cost });
      product.stock += row.quantity;
      const latest = latestDelivery.get(product.id);
      if (!latest || row.date >= latest) {
        product.cost = row.cost;
        latestDelivery.set(product.id, row.date);
      }
      suppliers.add(supplier);
    }

    for (const row of batch.sales) {
      const product = (row.productId && products.find((p) => p.id === row.productId)) || findProduct(index, row.productRef);
      if (!product) continue;
      saleSeq++;
      sales.push({
        id: `IS${String(saleSeq).padStart(6, "0")}`,
        date: row.date,
        orderId: row.orderId ?? `IMP-${batch.id}-${saleSeq}`,
        productId: product.id,
        quantity: row.quantity,
        price: row.price ?? product.price,
        cost: row.cost ?? product.cost,
      });
      product.stock = Math.max(0, product.stock - row.quantity);
    }
  }

  return { ...base, products, sales, purchases, brands: [...brands], categories: [...categories], suppliers: [...suppliers] };
}

/**
 * Attach product ids and names to a preview so the owner sees what will be
 * added, and move rows we cannot place into "skipped". Products the same file
 * adds count as known.
 */
export function resolvePreview(preview: ImportPreview, data: Dataset): ImportPreview {
  const pending: Product[] = preview.products.map((row, i) => ({
    id: `pending-${i}`,
    code: row.code,
    barcode: row.barcode ?? "",
    name: row.name,
    brand: row.brand ?? "Other",
    category: row.category ?? "Other",
    supplier: row.supplier ?? "Unknown supplier",
    cost: row.cost ?? 0,
    price: row.price ?? 0,
    stock: row.stock ?? 0,
  }));
  const index = indexProducts([...data.products, ...pending]);
  const skipped = [...preview.skipped];

  const sales = preview.sales.flatMap((row) => {
    const product = (row.productId && data.products.find((p) => p.id === row.productId)) || findProduct(index, row.productRef);
    if (!product) {
      skipped.push({ line: `${row.productRef} · ${row.quantity} sold on ${row.date}`, reason: "Product not found. Add it under Products first, or check the code." });
      return [];
    }
    return [{ ...row, productId: product.id.startsWith("pending-") ? undefined : product.id, productName: product.name }];
  });
  const purchases = preview.purchases.flatMap((row) => {
    const product = (row.productId && data.products.find((p) => p.id === row.productId)) || findProduct(index, row.productRef);
    if (!product) {
      skipped.push({ line: `${row.productRef} · ${row.quantity} delivered on ${row.date}`, reason: "Product not found. Add it under Products first, or check the code." });
      return [];
    }
    return [{ ...row, productId: product.id.startsWith("pending-") ? undefined : product.id, productName: product.name }];
  });

  const existingIndex = indexProducts(data.products);
  const products = preview.products.map((row) => {
    const existing = findProduct(existingIndex, row.code) ?? (row.barcode ? findProduct(existingIndex, row.barcode) : undefined) ?? findProduct(existingIndex, row.name);
    return existing ? { ...row, code: existing.code, name: row.name || existing.name } : row;
  });

  return { ...preview, products, sales, purchases, skipped };
}

/** What changed, for the confirmation message. */
export function summarize(batch: ImportBatch, before: Dataset, after: Dataset, skipped: number): ImportSummary {
  const beforeCodes = new Set(before.products.map((p) => p.code.toLowerCase()));
  const productsAdded = after.products.length - before.products.length;
  const productsUpdated = batch.products.filter((p) => beforeCodes.has(p.code.toLowerCase())).length;
  const beforeIndex = indexProducts(before.products);
  const costChanges = batch.purchases.filter((row) => {
    const product = findProduct(beforeIndex, row.productRef);
    return product && Math.abs(row.cost - product.cost) / product.cost > 0.01;
  }).length;
  return {
    batchId: batch.id,
    productsAdded,
    productsUpdated,
    salesAdded: after.sales.length - before.sales.length,
    purchasesAdded: after.purchases.length - before.purchases.length,
    costChanges,
    skipped,
  };
}
