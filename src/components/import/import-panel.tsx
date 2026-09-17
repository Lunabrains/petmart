"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CircleCheck, FileSpreadsheet, FileText, Upload } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { Section } from "@/components/common/section";
import { Pill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney, formatNumber, formatPrice, pluralize } from "@/lib/format";
import type { ImportPreview, ImportSummary } from "@/lib/imports/types";
import { cn } from "@/lib/utils";

type Phase = "idle" | "reading" | "preview" | "adding" | "done";

export function ImportPanel() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const total = preview ? preview.products.length + preview.sales.length + preview.purchases.length : 0;

  async function readFile(file: File) {
    setError(null);
    setSummary(null);
    setPreview(null);
    setFileName(file.name);
    setPhase("reading");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/import", { method: "POST", body });
      const json = (await res.json()) as { ok: boolean; preview?: ImportPreview; message?: string };
      if (!res.ok || !json.ok || !json.preview) throw new Error(json.message ?? "We could not read that file.");
      setPreview(json.preview);
      setPhase("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We could not read that file.");
      setPhase("idle");
    }
  }

  async function addToDashboard() {
    if (!preview) return;
    setError(null);
    setPhase("adding");
    try {
      const res = await fetch("/api/import", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preview }) });
      const json = (await res.json()) as { ok: boolean; summary?: ImportSummary; message?: string };
      if (!res.ok || !json.ok || !json.summary) throw new Error(json.message ?? "Nothing was added.");
      setSummary(json.summary);
      setPhase("done");
      setPreview(null);
      if (fileInput.current) fileInput.current.value = "";
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nothing was added.");
      setPhase("preview");
    }
  }

  function startOver() {
    setPreview(null);
    setSummary(null);
    setError(null);
    setFileName("");
    setPhase("idle");
    if (fileInput.current) fileInput.current.value = "";
  }

  const busy = phase === "reading" || phase === "adding";

  return (
    <div className="flex flex-col gap-6">
      <Section title="Upload a file" description="An Excel or CSV export from Wizzard, or a PDF from a supplier. We show you what we found before anything is added.">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const file = fileInput.current?.files?.[0];
            if (file) void readFile(file);
          }}
        >
          <label
            htmlFor="import-file"
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/40 px-6 py-8 text-center transition-colors hover:border-brand hover:bg-brand-muted/40",
              busy && "pointer-events-none opacity-60",
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) void readFile(file);
            }}
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-brand-muted text-brand">
              <Upload className="size-5" />
            </span>
            <span className="text-base font-medium">{fileName || "Choose a file or drop it here"}</span>
            <span className="text-sm text-muted-foreground">Excel (.xlsx), CSV or PDF, up to 15 MB</span>
            <input
              id="import-file"
              ref={fileInput}
              type="file"
              name="file"
              accept=".xlsx,.xlsm,.xls,.csv,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void readFile(file);
              }}
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={busy}>
              {phase === "reading" ? "Reading..." : "Read File"}
            </Button>
            <span className="text-sm text-muted-foreground">Try it with a sample:</span>
            <a href="/api/import/sample?type=excel" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
              <FileSpreadsheet className="size-4" /> Wizzard export (Excel)
            </a>
            <a href="/api/import/sample?type=pdf" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
              <FileText className="size-4" /> Supplier delivery note (PDF)
            </a>
          </div>
          {error && <p className="rounded-lg bg-critical-muted px-4 py-3 text-sm font-medium text-critical">{error}</p>}
        </form>
      </Section>

      {summary && (
        <Section title="Added to the dashboard" description="The numbers on every page now include this file.">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 rounded-xl bg-success-muted px-4 py-3">
              <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" />
              <p className="text-sm">
                {[
                  summary.productsAdded > 0 && `${pluralize(summary.productsAdded, "new product")}`,
                  summary.productsUpdated > 0 && `${pluralize(summary.productsUpdated, "product")} updated`,
                  summary.purchasesAdded > 0 && `${pluralize(summary.purchasesAdded, "delivery", "deliveries")}`,
                  summary.salesAdded > 0 && `${pluralize(summary.salesAdded, "sale")}`,
                ]
                  .filter(Boolean)
                  .join(", ") || "Nothing new"}
                {summary.costChanges > 0 && `. Supplier cost changed on ${pluralize(summary.costChanges, "product")}; check Alerts.`}
                {summary.skipped > 0 && ` ${pluralize(summary.skipped, "line")} could not be read and ${summary.skipped === 1 ? "was" : "were"} skipped.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/">See Home</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/stock">See Stock</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/alerts">See Alerts</Link>
              </Button>
              <Button variant="ghost" onClick={startOver}>
                Import another file
              </Button>
            </div>
          </div>
        </Section>
      )}

      {preview && (
        <Section
          title={`What we found in ${preview.fileName}`}
          description={`${preview.documentType}. ${preview.notes.join(" ")}`}
          action={
            <div className="flex gap-2">
              <Button variant="ghost" onClick={startOver} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={() => void addToDashboard()} disabled={busy || total === 0}>
                {phase === "adding" ? "Adding..." : `Add to Dashboard`}
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-6">
            {total === 0 && <EmptyState title="Nothing to add" description="We could not find products, sales or deliveries in this file." />}

            {preview.products.length > 0 && (
              <PreviewBlock title={`${pluralize(preview.products.length, "product")}`}>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Product</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Selling Price</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.products.map((p, i) => (
                      <TableRow key={`${p.code}-${i}`}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-muted-foreground">{p.code}</TableCell>
                        <TableCell className="tabular text-right">{p.cost !== undefined ? formatPrice(p.cost) : "—"}</TableCell>
                        <TableCell className="tabular text-right">{p.price !== undefined ? formatPrice(p.price) : "—"}</TableCell>
                        <TableCell className="tabular text-right">{p.stock !== undefined ? formatNumber(p.stock) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </PreviewBlock>
            )}

            {preview.purchases.length > 0 && (
              <PreviewBlock title={`${pluralize(preview.purchases.length, "delivery", "deliveries")}`} caption="Stock goes up and the unit cost becomes the latest cost.">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Product</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.purchases.map((r, i) => (
                      <TableRow key={`${r.productRef}-${i}`}>
                        <TableCell className="font-medium">{r.productName ?? r.productRef}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(r.date)}</TableCell>
                        <TableCell className="text-muted-foreground">{r.supplier ?? "—"}</TableCell>
                        <TableCell className="tabular text-right">{formatNumber(r.quantity)}</TableCell>
                        <TableCell className="tabular text-right">{formatPrice(r.cost)}</TableCell>
                        <TableCell className="tabular text-right">{formatMoney(r.quantity * r.cost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </PreviewBlock>
            )}

            {preview.sales.length > 0 && (
              <PreviewBlock title={`${pluralize(preview.sales.length, "sale")}`} caption="Stock goes down and the sales show on every page.">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Product</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.sales.map((r, i) => (
                      <TableRow key={`${r.productRef}-${i}`}>
                        <TableCell className="font-medium">{r.productName ?? r.productRef}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(r.date)}</TableCell>
                        <TableCell className="tabular text-right">{formatNumber(r.quantity)}</TableCell>
                        <TableCell className="tabular text-right">{r.price !== undefined ? formatPrice(r.price) : "Current price"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </PreviewBlock>
            )}

            {preview.skipped.length > 0 && (
              <PreviewBlock title={`${pluralize(preview.skipped.length, "line")} we could not read`} caption="These will be left out.">
                <ul className="flex flex-col gap-2">
                  {preview.skipped.slice(0, 20).map((s, i) => (
                    <li key={i} className="flex flex-col gap-0.5 rounded-lg bg-muted/60 px-3 py-2 text-sm sm:flex-row sm:items-baseline sm:gap-3">
                      <span className="min-w-0 truncate font-medium">{s.line}</span>
                      <span className="text-muted-foreground">{s.reason}</span>
                    </li>
                  ))}
                  {preview.skipped.length > 20 && <li className="text-sm text-muted-foreground">and {preview.skipped.length - 20} more</li>}
                </ul>
              </PreviewBlock>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}

function PreviewBlock({ title, caption, children }: { title: string; caption?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-2">
        <Pill tone="info">{title}</Pill>
        {caption && <span className="text-sm text-muted-foreground">{caption}</span>}
      </div>
      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">{children}</div>
    </div>
  );
}

export function ResetImportsButton({ count }: { count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (count === 0) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch("/api/import", { method: "DELETE" });
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Removing..." : "Remove imported files"}
    </Button>
  );
}
