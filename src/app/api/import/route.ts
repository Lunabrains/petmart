import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { addImportBatch, getData, resetImports, todayISO } from "@/lib/data";
import { applyImports, resolvePreview, summarize } from "@/lib/imports/apply";
import { parseSpreadsheet } from "@/lib/imports/excel";
import { parsePdf } from "@/lib/imports/pdf";
import type { ImportBatch, ImportPreview } from "@/lib/imports/types";

export const runtime = "nodejs";

const MAX_BYTES = 15 * 1024 * 1024;

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

/** POST a file (multipart "file"): read it and return what it would add. Nothing is added yet. */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return bad("Please choose a file to upload.");
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return bad("Please choose a file to upload.");
  if (file.size > MAX_BYTES) return bad("That file is too large. Please upload a file under 15 MB.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const name = file.name || "upload";
  const data = getData();
  const today = todayISO();

  try {
    let preview: ImportPreview;
    if (/\.pdf$/i.test(name) || file.type === "application/pdf") {
      preview = await parsePdf(bytes, name, data.products, data.suppliers, today);
    } else if (/\.(xlsx|xlsm|xls|csv|tsv)$/i.test(name) || /spreadsheet|excel|csv/.test(file.type)) {
      preview = parseSpreadsheet(bytes, name, today);
    } else {
      return bad("Please upload an Excel file (.xlsx), a CSV file or a PDF.");
    }
    return NextResponse.json({ ok: true, preview: resolvePreview(preview, data) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return bad(`We could not read that file. ${message}`, 422);
  }
}

/** PUT the reviewed preview: add it to the dashboard. */
export async function PUT(req: Request) {
  let body: { preview?: ImportPreview };
  try {
    body = (await req.json()) as { preview?: ImportPreview };
  } catch {
    return bad("Nothing to add.");
  }
  const preview = body.preview;
  if (!preview || !Array.isArray(preview.products) || !Array.isArray(preview.sales) || !Array.isArray(preview.purchases)) return bad("Nothing to add.");
  if (preview.products.length + preview.sales.length + preview.purchases.length === 0) return bad("The file had nothing we could add.");

  const before = getData();
  const clean = resolvePreview({ ...preview, skipped: [] }, before);
  const batch: ImportBatch = {
    id: `${Date.now().toString(36)}`,
    at: new Date().toISOString(),
    fileName: String(preview.fileName ?? "upload").slice(0, 120),
    documentType: String(preview.documentType ?? "File").slice(0, 60),
    products: clean.products,
    sales: clean.sales,
    purchases: clean.purchases,
  };
  const after = applyImports(before, [batch]);
  addImportBatch(batch);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, summary: summarize(batch, before, after, clean.skipped.length + (preview.skipped?.length ?? 0)) });
}

/** DELETE: forget every import and go back to the demo data. */
export async function DELETE() {
  resetImports();
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
