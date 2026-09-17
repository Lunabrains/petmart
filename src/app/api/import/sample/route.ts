import { NextResponse } from "next/server";

import { getData } from "@/lib/data";
import { buildSampleInvoicePdf, buildSampleWorkbook } from "@/lib/imports/samples";

export const runtime = "nodejs";

/** GET ?type=excel | pdf: a sample file built from today's data. */
export async function GET(req: Request) {
  const type = new URL(req.url).searchParams.get("type");
  const data = getData();
  if (type === "pdf") {
    const bytes = await buildSampleInvoicePdf(data);
    return new NextResponse(new Uint8Array(bytes), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="supplier-delivery-note.pdf"` },
    });
  }
  const bytes = buildSampleWorkbook(data);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="wizzard-export-sample.xlsx"`,
    },
  });
}
