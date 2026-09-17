import * as XLSX from "xlsx";

import type { ImportedProduct, ImportedPurchase, ImportedSale, ImportPreview, SkippedLine } from "./types";
import { toISODate, toNumber, toText } from "./values";

/**
 * Excel / CSV exports. Each sheet (or the single CSV table) is read as rows
 * under a header line; column names are matched loosely ("Qty", "Quantity",
 * "Units"...), and the sheet is treated as products, sales or deliveries
 * depending on its name and columns.
 */

type Field = "code" | "barcode" | "name" | "brand" | "category" | "supplier" | "cost" | "price" | "stock" | "quantity" | "date" | "orderId";

const SYNONYMS: Record<Field, string[]> = {
  code: ["code", "productcode", "itemcode", "sku", "ref", "reference", "article", "articleno", "itemno", "productid"],
  barcode: ["barcode", "ean", "upc", "gtin", "ean13"],
  name: ["product", "productname", "name", "item", "itemname", "description", "designation", "article name"],
  brand: ["brand", "make", "manufacturer"],
  category: ["category", "group", "family", "department", "productgroup"],
  supplier: ["supplier", "vendor", "from", "suppliername"],
  cost: ["cost", "unitcost", "purchasecost", "costprice", "buyprice", "purchaseprice", "costperunit", "netcost"],
  price: ["price", "sellingprice", "saleprice", "sellprice", "retailprice", "unitprice", "priceperunit", "sellingpriceperunit"],
  stock: ["stock", "quantityinstock", "onhand", "qtyonhand", "inventory", "currentstock", "instock", "stockqty", "available"],
  quantity: ["quantity", "qty", "units", "sold", "pcs", "pieces", "quantitysold", "qtysold", "delivered", "received"],
  date: ["date", "saledate", "invoicedate", "deliverydate", "day", "orderdate", "transactiondate", "datetime"],
  orderId: ["order", "orderid", "orderno", "ordernumber", "invoice", "invoiceno", "invoicenumber", "ticket", "receipt", "receiptno", "docno", "document"],
};

const normalizeHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

function mapHeaders(headers: string[]): Partial<Record<Field, string>> {
  const map: Partial<Record<Field, string>> = {};
  for (const header of headers) {
    const key = normalizeHeader(header);
    if (!key) continue;
    for (const [field, names] of Object.entries(SYNONYMS) as Array<[Field, string[]]>) {
      if (map[field]) continue;
      if (names.some((n) => normalizeHeader(n) === key)) {
        map[field] = header;
        break;
      }
    }
  }
  return map;
}

export type SheetKind = "products" | "sales" | "purchases" | "unknown";

export function detectKind(sheetName: string, fields: Partial<Record<Field, string>>): SheetKind {
  const name = sheetName.toLowerCase();
  if (/purchase|deliver|supplier|receiv|invoice in|goods in/.test(name)) return "purchases";
  if (/sale|order|sold|ticket|receipt|invoice/.test(name)) return "sales";
  if (/product|item|stock|catalog|price/.test(name)) return "products";
  const has = (f: Field) => Boolean(fields[f]);
  if (has("supplier") && has("quantity") && has("cost")) return "purchases";
  if (has("quantity") && has("date") && !has("stock")) return "sales";
  if (has("quantity") && has("cost") && !has("price") && !has("stock")) return "purchases";
  if (has("stock") || has("price") || (has("name") && has("code"))) return "products";
  if (has("quantity")) return "sales";
  return "unknown";
}

interface Table {
  sheet: string;
  headers: string[];
  rows: Array<Record<string, unknown>>;
}

function readTables(bytes: Uint8Array): Table[] {
  const workbook = XLSX.read(bytes, { type: "array", cellDates: false });
  return workbook.SheetNames.map((sheet) => {
    const ws = workbook.Sheets[sheet];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null, raw: true });
    const headerRow = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, range: 0 })[0] ?? [];
    const headers = (headerRow as unknown[]).map((h) => toText(h)).filter(Boolean);
    return { sheet, headers, rows };
  });
}

export function parseSpreadsheet(bytes: Uint8Array, fileName: string, today: string): ImportPreview {
  const isCsv = /\.csv$/i.test(fileName);
  const preview: ImportPreview = {
    fileName,
    fileType: isCsv ? "csv" : "excel",
    documentType: isCsv ? "CSV file" : "Spreadsheet",
    products: [],
    sales: [],
    purchases: [],
    skipped: [],
    notes: [],
  };

  for (const table of readTables(bytes)) {
    if (table.rows.length === 0) continue;
    const fields = mapHeaders(table.headers);
    const kind = detectKind(table.sheet, fields);
    const get = (row: Record<string, unknown>, field: Field) => (fields[field] ? row[fields[field]!] : undefined);
    const label = (row: Record<string, unknown>, i: number) =>
      `${table.sheet}, row ${i + 2}: ${Object.values(row).filter((v) => v !== null && v !== "").slice(0, 4).map(toText).join(" · ")}`;

    if (kind === "unknown") {
      preview.skipped.push({ line: `Sheet "${table.sheet}"`, reason: `Could not tell what this sheet contains (columns: ${table.headers.join(", ") || "none"}).` });
      continue;
    }

    let count = 0;
    table.rows.forEach((row, i) => {
      if (Object.values(row).every((v) => v === null || v === "")) return;
      const ref = toText(get(row, "code")) || toText(get(row, "barcode")) || toText(get(row, "name"));
      if (kind === "products") {
        const name = toText(get(row, "name"));
        const code = toText(get(row, "code"));
        if (!name && !code) return void preview.skipped.push({ line: label(row, i), reason: "No product name or code." });
        const product: ImportedProduct = { code: code || name, name: name || code };
        const barcode = toText(get(row, "barcode"));
        const brand = toText(get(row, "brand"));
        const category = toText(get(row, "category"));
        const supplier = toText(get(row, "supplier"));
        const cost = toNumber(get(row, "cost"));
        const price = toNumber(get(row, "price"));
        const stock = toNumber(get(row, "stock"));
        if (barcode) product.barcode = barcode;
        if (brand) product.brand = brand;
        if (category) product.category = category;
        if (supplier) product.supplier = supplier;
        if (cost !== undefined) product.cost = cost;
        if (price !== undefined) product.price = price;
        if (stock !== undefined) product.stock = Math.max(0, Math.round(stock));
        preview.products.push(product);
        count++;
        return;
      }
      if (!ref) return void preview.skipped.push({ line: label(row, i), reason: "No product code, barcode or name." });
      const quantity = toNumber(get(row, "quantity"));
      if (quantity === undefined || quantity <= 0) return void preview.skipped.push({ line: label(row, i), reason: "No quantity." });
      const date = toISODate(get(row, "date")) ?? today;
      if (kind === "sales") {
        const sale: ImportedSale = { date, productRef: ref, quantity: Math.round(quantity) };
        const price = toNumber(get(row, "price"));
        const cost = toNumber(get(row, "cost"));
        const orderId = toText(get(row, "orderId"));
        if (price !== undefined) sale.price = price;
        if (cost !== undefined) sale.cost = cost;
        if (orderId) sale.orderId = orderId;
        preview.sales.push(sale);
      } else {
        const cost = toNumber(get(row, "cost")) ?? toNumber(get(row, "price"));
        if (cost === undefined || cost <= 0) return void preview.skipped.push({ line: label(row, i), reason: "No unit cost." });
        const purchase: ImportedPurchase = { date, productRef: ref, quantity: Math.round(quantity), cost };
        const supplier = toText(get(row, "supplier"));
        if (supplier) purchase.supplier = supplier;
        preview.purchases.push(purchase);
      }
      count++;
    });
    const what = kind === "purchases" ? "deliveries" : kind;
    preview.notes.push(`Read ${count} ${what} from "${table.sheet}".`);
  }

  if (preview.products.length + preview.sales.length + preview.purchases.length === 0 && preview.skipped.length === 0) {
    preview.skipped.push({ line: fileName, reason: "The file has no rows we could read." } satisfies SkippedLine);
  }
  return preview;
}
