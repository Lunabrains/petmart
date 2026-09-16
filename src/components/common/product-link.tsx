import Link from "next/link";

import type { Product } from "@/lib/data";
import { cn } from "@/lib/utils";

interface ProductLinkProps {
  product: Pick<Product, "id" | "name" | "brand" | "category" | "code">;
  /** Show category / code under the name. */
  detail?: boolean;
  className?: string;
}

/** Product name that opens the product page. */
export function ProductLink({ product, detail, className }: ProductLinkProps) {
  return (
    <Link href={`/products/${product.id}`} className={cn("group inline-block min-w-0", className)}>
      <span className="block truncate font-medium group-hover:underline">{product.name}</span>
      {detail && (
        <span className="block truncate text-xs text-muted-foreground">
          {product.category} · {product.code}
        </span>
      )}
    </Link>
  );
}
