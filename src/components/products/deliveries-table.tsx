import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Purchase } from "@/lib/data";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Every delivery on record, most recent first. A cost higher than the delivery before is shown in red. */
export function DeliveriesTable({ purchases }: { purchases: Purchase[] }) {
  const rows = [...purchases].reverse();

  return (
    <div>
      {rows.length === 1 && <p className="px-5 pb-3 text-sm text-muted-foreground lg:px-6">Only one delivery on record</p>}
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-5 lg:pl-6">Date</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="pr-5 text-right lg:pr-6">Cost Per Unit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((d, i) => {
            const before = rows[i + 1];
            const wentUp = before !== undefined && d.cost > before.cost;
            const wentDown = before !== undefined && d.cost < before.cost;
            return (
              <TableRow key={d.id}>
                <TableCell className="pl-5 lg:pl-6">{formatDate(d.date)}</TableCell>
                <TableCell>{d.supplier}</TableCell>
                <TableCell className="tabular text-right">{formatNumber(d.quantity)}</TableCell>
                <TableCell className={cn("tabular pr-5 text-right lg:pr-6", wentUp && "font-semibold text-critical", wentDown && "text-success")}>
                  {formatPrice(d.cost)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
