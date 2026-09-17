import { addDays, format, parseISO } from "date-fns";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as XLSX from "xlsx";

import type { Dataset, Product } from "../data/types";

/**
 * Sample files for the demo, built from today's data so the codes, costs and
 * dates always line up: a Wizzard-style spreadsheet and a supplier delivery
 * note. Uploading them shows the whole import flow in a minute.
 */

function pick(data: Dataset, name: string): Product {
  const p = data.products.find((x) => x.name === name);
  if (!p) throw new Error(`Sample product missing: ${name}`);
  return p;
}

/** The delivery lines both samples use: the running-low top seller restocked, two cost increases. */
export function sampleDeliveryLines(data: Dataset): Array<{ product: Product; quantity: number; cost: number }> {
  const topSeller = pick(data, "Royal Canin Maxi Adult 15kg");
  const lamb = data.products.find((p) => /Lamb & Rice 15kg/.test(p.name) && p.brand === "Hill's") ?? data.products[5];
  const litter = data.products.find((p) => p.category === "Cat Litter" && p.brand === "Catit") ?? data.products[200];
  const pouch = data.products.find((p) => /Tuna Pouch/.test(p.name)) ?? data.products[120];
  const bed = data.products.find((p) => /Donut Bed M/.test(p.name)) ?? data.products[450];
  const round2 = (v: number) => Math.round(v * 100) / 100;
  return [
    { product: topSeller, quantity: 60, cost: topSeller.cost },
    { product: lamb, quantity: 40, cost: round2(lamb.cost * 1.09) },
    { product: litter, quantity: 48, cost: round2(litter.cost * 1.07) },
    { product: pouch, quantity: 480, cost: pouch.cost },
    { product: bed, quantity: 12, cost: bed.cost },
  ];
}

export function buildSampleWorkbook(data: Dataset): Uint8Array {
  const today = data.today;
  const yesterday = format(addDays(parseISO(today), -1), "yyyy-MM-dd");
  const wb = XLSX.utils.book_new();

  const products = [
    { Code: "PM-DF-001", Barcode: "6291234000017", Product: "Petmart Own Brand Dog Food 12kg", Brand: "Petmart", Category: "Dog Food", Supplier: "Prime Feed Distributors", Cost: 31.5, "Selling Price": 45, Stock: 80 },
    { Code: "PM-CF-001", Barcode: "6291234000024", Product: "Petmart Own Brand Cat Food 4kg", Brand: "Petmart", Category: "Cat Food", Supplier: "Prime Feed Distributors", Cost: 14.2, "Selling Price": 21, Stock: 120 },
    { Code: "PM-TR-001", Barcode: "6291234000031", Product: "Petmart Salmon Training Treats 150g", Brand: "Petmart", Category: "Treats", Supplier: "Prime Feed Distributors", Cost: 2.6, "Selling Price": 4.5, Stock: 200 },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(products), "Products");

  const sellers = data.products.filter((p) => p.price >= 10).slice(0, 40);
  const sales = [];
  let ticket = 1;
  for (let i = 0; i < 24; i++) {
    const p = sellers[(i * 7) % sellers.length];
    sales.push({ Date: i % 3 === 0 ? yesterday : today, "Invoice No": `WZ-${String(9000 + ticket).padStart(5, "0")}`, Code: p.code, Product: p.name, Qty: (i % 4) + 1, "Unit Price": p.price });
    if (i % 2 === 1) ticket++;
  }
  sales.push({ Date: today, "Invoice No": `WZ-${String(9000 + ticket).padStart(5, "0")}`, Code: "PM-DF-001", Product: "Petmart Own Brand Dog Food 12kg", Qty: 3, "Unit Price": 45 });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sales), "Sales");

  const purchases = sampleDeliveryLines(data).map((line) => ({
    Date: today,
    Supplier: line.product.supplier,
    Code: line.product.code,
    Product: line.product.name,
    Quantity: line.quantity,
    "Unit Cost": line.cost,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(purchases), "Purchases");

  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer);
}

export async function buildSampleInvoicePdf(data: Dataset): Promise<Uint8Array> {
  const lines = sampleDeliveryLines(data);
  const supplier = lines[0].product.supplier;
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const dark = rgb(0.13, 0.13, 0.13);
  const grey = rgb(0.45, 0.45, 0.45);
  const draw = (text: string, x: number, y: number, size = 10, f = font, color = dark) => page.drawText(text, { x, y, size, font: f, color });

  draw(supplier, 50, 780, 18, bold);
  draw("DELIVERY NOTE / INVOICE", 50, 755, 12, bold, grey);
  draw(`Invoice No: INV-${data.today.replace(/-/g, "")}-0417`, 50, 730);
  draw(`Date: ${format(parseISO(data.today), "d MMM yyyy")}`, 50, 715);
  draw("Bill to: Petmart Animal Supplies", 50, 700);
  draw("Supplier: " + supplier, 50, 685);

  let y = 640;
  draw("Code", 50, y, 10, bold);
  draw("Product", 130, y, 10, bold);
  draw("Qty", 400, y, 10, bold);
  draw("Unit Cost", 450, y, 10, bold);
  draw("Total", 520, y, 10, bold);
  page.drawLine({ start: { x: 50, y: y - 6 }, end: { x: 560, y: y - 6 }, thickness: 0.8, color: grey });
  y -= 24;
  let total = 0;
  for (const line of lines) {
    const amount = line.quantity * line.cost;
    total += amount;
    draw(line.product.code, 50, y);
    draw(line.product.name, 130, y);
    draw(String(line.quantity), 400, y);
    draw(line.cost.toFixed(2), 450, y);
    draw(amount.toFixed(2), 520, y);
    y -= 20;
  }
  page.drawLine({ start: { x: 50, y: y + 8 }, end: { x: 560, y: y + 8 }, thickness: 0.8, color: grey });
  draw("Total", 450, y - 10, 11, bold);
  draw(total.toFixed(2), 520, y - 10, 11, bold);
  draw("Prices are per unit, excluding VAT. Goods delivered to the main warehouse.", 50, y - 50, 9, font, grey);

  return pdf.save();
}
