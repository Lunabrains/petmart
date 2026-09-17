import type { Metadata } from "next";
import { format, parseISO } from "date-fns";

import { EmptyState } from "@/components/common/empty-state";
import { PageTitle } from "@/components/common/page-title";
import { Section } from "@/components/common/section";
import { ImportPanel, ResetImportsButton } from "@/components/import/import-panel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listImportBatches } from "@/lib/data";
import { formatNumber } from "@/lib/format";
import { loadData } from "@/lib/server-data";

export const metadata: Metadata = { title: "Import" };

export default async function ImportPage() {
  await loadData();
  const batches = listImportBatches();

  return (
    <div className="flex flex-col gap-8 lg:gap-10">
      <PageTitle title="Import" subtitle="Add products, sales and deliveries by uploading a file. Nothing is sent back to Wizzard." />

      <ImportPanel />

      <Section
        title="Added so far"
        description={batches.length ? "Files added during this demo session." : "Nothing has been imported yet."}
        action={<ResetImportsButton count={batches.length} />}
        flush={batches.length > 0}
      >
        {batches.length ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5 lg:pl-6">File</TableHead>
                <TableHead>When</TableHead>
                <TableHead className="text-right">Products</TableHead>
                <TableHead className="text-right">Deliveries</TableHead>
                <TableHead className="pr-5 text-right lg:pr-6">Sales</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="pl-5 lg:pl-6">
                    <span className="block font-medium">{b.fileName}</span>
                    <span className="block text-xs text-muted-foreground">{b.documentType}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{format(parseISO(b.at), "MMM d, HH:mm")}</TableCell>
                  <TableCell className="tabular text-right">{formatNumber(b.products)}</TableCell>
                  <TableCell className="tabular text-right">{formatNumber(b.purchases)}</TableCell>
                  <TableCell className="tabular pr-5 text-right lg:pr-6">{formatNumber(b.sales)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState title="No files added yet" description="Upload a Wizzard export or a supplier document above, or try one of the samples." />
        )}
      </Section>
    </div>
  );
}
