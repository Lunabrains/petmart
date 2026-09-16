import { ProductLink } from "@/components/common/product-link";
import { Pill } from "@/components/common/status-pill";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDaysAgo, formatMoney } from "@/lib/format";
import type { ProductStats } from "@/lib/metrics";

/** A product with no sale at all in the history gets the second message; `history` is how far back it goes. */
function noSalesMessage(lastSaleDaysAgo: number | null, history: number): string {
  if (lastSaleDaysAgo === null) return `No Sales in the Last ${history} Days`;
  return `No Sales for ${lastSaleDaysAgo} Days`;
}

/** Products with stock on the shelf and no sale for a long time, biggest value first. */
export function NoSalesTable({ rows, history }: { rows: ProductStats[]; history: number }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-5 lg:pl-6">Product</TableHead>
          <TableHead className="text-right">Stock Value</TableHead>
          <TableHead className="text-right">Last Sale</TableHead>
          <TableHead className="pr-5 text-right lg:pr-6">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((s) => (
          <TableRow key={s.product.id}>
            <TableCell className="max-w-[16rem] pl-5 lg:pl-6">
              <ProductLink product={s.product} detail />
            </TableCell>
            <TableCell className="tabular text-right font-medium">{formatMoney(s.stockValue)}</TableCell>
            <TableCell className="tabular text-right">{formatDaysAgo(s.lastSaleDaysAgo)}</TableCell>
            <TableCell className="pr-5 text-right lg:pr-6">
              <Pill tone="warning">{noSalesMessage(s.lastSaleDaysAgo, history)}</Pill>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
