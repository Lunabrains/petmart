import { ProductLink } from "@/components/common/product-link";
import { ProductStatusPills } from "@/components/products/product-status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber, formatPercent, formatPrice } from "@/lib/format";
import type { ProductStats } from "@/lib/metrics";
import { cn } from "@/lib/utils";

/** The search results: one row per product, scrolls sideways on a phone. */
export function ProductResults({ products }: { products: ProductStats[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-5 lg:pl-6">Product</TableHead>
          <TableHead className="text-right">Selling Price</TableHead>
          <TableHead className="text-right">Cost</TableHead>
          <TableHead className="text-right">Profit</TableHead>
          <TableHead className="text-right">Stock</TableHead>
          <TableHead className="text-right">Sold Last 30 Days</TableHead>
          <TableHead className="pr-5 lg:pr-6">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((s) => (
          <TableRow key={s.product.id}>
            <TableCell className="max-w-[11rem] sm:max-w-[16rem] pl-5 lg:pl-6">
              <ProductLink product={s.product} detail />
            </TableCell>
            <TableCell className="tabular text-right">{formatPrice(s.product.price)}</TableCell>
            <TableCell className="tabular text-right">{formatPrice(s.product.cost)}</TableCell>
            <TableCell className="tabular text-right">
              <span className={cn("font-medium", s.profitPerUnit > 0 && !s.costChange?.profitDropped ? "text-success" : "text-critical")}>
                {formatPrice(s.profitPerUnit)}
              </span>
              <span className="ml-1.5 text-xs text-muted-foreground">{formatPercent(s.margin)}</span>
            </TableCell>
            <TableCell className="tabular text-right">
              <span className={s.status === "running-low" ? "font-semibold text-critical" : undefined}>{formatNumber(s.product.stock)}</span>
            </TableCell>
            <TableCell className="tabular text-right">{formatNumber(s.units30)}</TableCell>
            <TableCell className="pr-5 lg:pr-6">
              <ProductStatusPills stats={s} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
