import assert from "node:assert/strict";
import { describe, it } from "node:test";

import * as XLSX from "xlsx";

import { buildAlerts } from "../src/lib/alerts";
import { DEMO_CASES, generateDemo } from "../src/lib/data/demo";
import { applyImports, resolvePreview, summarize } from "../src/lib/imports/apply";
import { detectKind, parseSpreadsheet } from "../src/lib/imports/excel";
import { findProduct, findProductInText, indexProducts } from "../src/lib/imports/match";
import { detectDocumentKind, parsePdfText, pdfToText } from "../src/lib/imports/pdf";
import { buildSampleInvoicePdf, buildSampleWorkbook, sampleDeliveryLines } from "../src/lib/imports/samples";
import type { ImportBatch } from "../src/lib/imports/types";
import { findDateInText, toISODate, toNumber } from "../src/lib/imports/values";
import { getProductStats } from "../src/lib/metrics";

const TODAY = "2026-09-17";
const data = generateDemo(TODAY);
const topSeller = data.products.find((p) => p.name === DEMO_CASES.topSellerRunningLow)!;

describe("import values", () => {
  it("reads numbers and dates the way people write them", () => {
    assert.equal(toNumber("$1,234.50"), 1234.5);
    assert.equal(toNumber(" 12 "), 12);
    assert.equal(toNumber("abc"), undefined);
    assert.equal(toISODate("2026-09-17"), "2026-09-17");
    assert.equal(toISODate("17/09/2026"), "2026-09-17");
    assert.equal(toISODate("17.9.2026"), "2026-09-17");
    assert.equal(toISODate("17 Sep 2026"), "2026-09-17");
    assert.equal(toISODate("Sep 17, 2026"), "2026-09-17");
    assert.equal(toISODate(46282), "2026-09-17"); // Excel serial
    assert.equal(toISODate("hello"), undefined);
    assert.equal(findDateInText("Invoice INV-1 Date: 17 Sep 2026 Bill to"), "2026-09-17");
  });
});

describe("product matching", () => {
  const index = indexProducts(data.products);

  it("finds products by code, barcode and name, and inside a line of text", () => {
    assert.equal(findProduct(index, topSeller.code)?.id, topSeller.id);
    assert.equal(findProduct(index, topSeller.code.toLowerCase())?.id, topSeller.id);
    assert.equal(findProduct(index, topSeller.barcode)?.id, topSeller.id);
    assert.equal(findProduct(index, topSeller.name.toUpperCase())?.id, topSeller.id);
    assert.equal(findProduct(index, "nothing like this"), undefined);
    const line = `${topSeller.code}  ${topSeller.name}   60   62.00   3720.00`;
    assert.equal(findProductInText(index, line)?.product.id, topSeller.id);
    assert.equal(findProductInText(index, `Delivered: ${topSeller.name} x 60`)?.product.id, topSeller.id);
  });
});

describe("spreadsheet import", () => {
  it("tells sheets apart by name and by columns", () => {
    assert.equal(detectKind("Purchases", {}), "purchases");
    assert.equal(detectKind("Sales", {}), "sales");
    assert.equal(detectKind("Products", {}), "products");
    assert.equal(detectKind("Sheet1", { supplier: "Supplier", quantity: "Qty", cost: "Cost" }), "purchases");
    assert.equal(detectKind("Sheet1", { date: "Date", quantity: "Qty", name: "Product" }), "sales");
    assert.equal(detectKind("Sheet1", { name: "Product", code: "Code", stock: "Stock" }), "products");
    assert.equal(detectKind("Sheet1", { brand: "Brand" }), "unknown");
  });

  it("reads the sample Wizzard export", () => {
    const preview = parseSpreadsheet(buildSampleWorkbook(data), "wizzard-export-sample.xlsx", TODAY);
    assert.equal(preview.fileType, "excel");
    assert.equal(preview.products.length, 3);
    assert.equal(preview.products[0].code, "PM-DF-001");
    assert.equal(preview.products[0].price, 45);
    assert.equal(preview.sales.length, 25);
    assert.equal(preview.purchases.length, 5);
    assert.equal(preview.purchases[0].productRef, topSeller.code);
    assert.equal(preview.purchases[0].quantity, 60);
    assert.equal(preview.skipped.length, 0);
    assert.ok(preview.notes.some((n) => /deliveries/.test(n)));

    const resolved = resolvePreview(preview, data);
    assert.equal(resolved.skipped.length, 0, JSON.stringify(resolved.skipped));
    assert.equal(resolved.purchases[0].productId, topSeller.id);
    assert.equal(resolved.purchases[0].productName, topSeller.name);
    // The sale of the new product resolves through the Products sheet in the same file.
    const newSale = resolved.sales.find((s) => s.productRef === "PM-DF-001")!;
    assert.equal(newSale.productId, undefined);
    assert.equal(newSale.productName, "Petmart Own Brand Dog Food 12kg");
  });

  it("reads a plain CSV with loose column names and skips bad rows", () => {
    const csv = ["Date,Item,Qty,Unit Price", `17/09/2026,${topSeller.code},2,89`, `17/09/2026,${topSeller.name},1,89`, "17/09/2026,ZZZ-ZZ-999,3,10", "17/09/2026,,4,5", "not a date,RC-DF-033,,9"].join("\n");
    const preview = parseSpreadsheet(new TextEncoder().encode(csv), "sales.csv", TODAY);
    assert.equal(preview.fileType, "csv");
    assert.equal(preview.sales.length, 3);
    assert.equal(preview.skipped.length, 2);
    const resolved = resolvePreview(preview, data);
    assert.equal(resolved.sales.length, 2);
    assert.equal(resolved.skipped.length, 3);
    assert.ok(resolved.skipped.some((s) => /not found/i.test(s.reason)));
  });

  it("handles Excel date serials and a Products sheet with stock", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Date: 46282, "Product Code": topSeller.code, Quantity: 5, "Unit Cost": 70, Supplier: "Levant Pet Distribution" }]), "Goods In");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ SKU: "NEW-1", Description: "New Thing", "Sale Price": 10, "On Hand": 7 }]), "Items");
    const bytes = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer);
    const preview = parseSpreadsheet(bytes, "mixed.xlsx", TODAY);
    assert.equal(preview.purchases.length, 1);
    assert.equal(preview.purchases[0].date, "2026-09-17");
    assert.equal(preview.purchases[0].cost, 70);
    assert.equal(preview.products.length, 1);
    assert.equal(preview.products[0].stock, 7);
  });
});

describe("pdf import", () => {
  it("classifies documents by their wording", () => {
    assert.equal(detectDocumentKind("DELIVERY NOTE / INVOICE").kind, "purchases");
    assert.equal(detectDocumentKind("Daily sales report").kind, "sales");
    assert.equal(detectDocumentKind("New price list valid from").kind, "products");
  });

  it("reads delivery lines from text, ignoring the line total", () => {
    const text = `Levant Pet Distribution\nDELIVERY NOTE\nDate: 17 Sep 2026\nCode Product Qty Unit Cost Total\n${topSeller.code} ${topSeller.name} 60 62.00 3720.00\nSomething unknown 4 5.00 20.00\n`;
    const preview = parsePdfText(text, "note.pdf", data.products, data.suppliers, TODAY);
    assert.equal(preview.documentType, "Supplier invoice");
    assert.equal(preview.purchases.length, 1);
    assert.deepEqual(
      { ref: preview.purchases[0].productRef, qty: preview.purchases[0].quantity, cost: preview.purchases[0].cost, date: preview.purchases[0].date, supplier: preview.purchases[0].supplier },
      { ref: topSeller.code, qty: 60, cost: 62, date: "2026-09-17", supplier: "Levant Pet Distribution" },
    );
  });

  it("reads the generated sample delivery note end to end", async () => {
    const bytes = await buildSampleInvoicePdf(data);
    const text = await pdfToText(bytes);
    const preview = parsePdfText(text, "supplier-delivery-note.pdf", data.products, data.suppliers, TODAY);
    const expected = sampleDeliveryLines(data);
    assert.equal(preview.purchases.length, expected.length, `${JSON.stringify(preview.skipped)}\n${text}`);
    expected.forEach((line, i) => {
      const got = preview.purchases.find((p) => p.productRef === line.product.code)!;
      assert.ok(got, `line ${i} ${line.product.code}`);
      assert.equal(got.quantity, line.quantity);
      assert.equal(got.cost, line.cost);
    });
    assert.equal(preview.purchases[0].date, TODAY);
  });
});

describe("applying imports", () => {
  it("adds products, deliveries and sales without touching the base data", () => {
    const preview = resolvePreview(parseSpreadsheet(buildSampleWorkbook(data), "sample.xlsx", TODAY), data);
    const batch: ImportBatch = { id: "t1", at: `${TODAY}T10:00:00.000Z`, fileName: "sample.xlsx", documentType: "Spreadsheet", products: preview.products, sales: preview.sales, purchases: preview.purchases };
    const stockBefore = topSeller.stock;
    const after = applyImports(data, [batch]);

    assert.equal(data.products.length, 513, "base untouched");
    assert.equal(after.products.length, 516);
    const own = after.products.find((p) => p.code === "PM-DF-001")!;
    assert.equal(own.name, "Petmart Own Brand Dog Food 12kg");
    assert.equal(own.stock, 80 - 3, "the sale in the same file reduces the new product's stock");
    assert.equal(own.id, "N0001");

    const top = after.products.find((p) => p.id === topSeller.id)!;
    const soldInFile = preview.sales.filter((s) => s.productId === topSeller.id).reduce((t, s) => t + s.quantity, 0);
    assert.equal(top.stock, stockBefore + 60 - soldInFile);
    assert.equal(getProductStats(after, topSeller.id)!.status !== "running-low", true, "restocked");

    const lamb = sampleDeliveryLines(data)[1];
    const lambAfter = after.products.find((p) => p.id === lamb.product.id)!;
    assert.equal(lambAfter.cost, lamb.cost, "latest delivery sets the cost");
    const alerts = buildAlerts(after);
    assert.ok(alerts.some((a) => a.productId === lamb.product.id && a.rule === "cost-increase"), "cost increase shows up in alerts");

    const summary = summarize(batch, data, after, 0);
    assert.equal(summary.productsAdded, 3);
    assert.equal(summary.purchasesAdded, 5);
    assert.equal(summary.salesAdded, 25);
    assert.equal(summary.costChanges, 2);
  });

  it("updates an existing product when the code matches", () => {
    const batch: ImportBatch = { id: "t2", at: `${TODAY}T10:00:00.000Z`, fileName: "x.xlsx", documentType: "Spreadsheet", products: [{ code: topSeller.code, name: topSeller.name, price: 95 }], sales: [], purchases: [] };
    const after = applyImports(data, [batch]);
    assert.equal(after.products.length, data.products.length);
    assert.equal(after.products.find((p) => p.id === topSeller.id)!.price, 95);
    assert.equal(topSeller.price, 89);
  });
});
