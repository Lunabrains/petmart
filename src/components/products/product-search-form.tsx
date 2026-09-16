import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Plain GET form: the browser reloads /products?q=... with no client code at all. */
export function ProductSearchForm({ query }: { query: string }) {
  return (
    <form action="/products" method="get" role="search" className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <label htmlFor="product-search" className="sr-only">
        Search products
      </label>
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          id="product-search"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Search by name, code, barcode or brand"
          autoComplete="off"
          className="h-11 rounded-xl bg-card pl-10 text-base md:text-base"
        />
      </div>
      <Button type="submit" size="lg" className="h-11 rounded-xl px-6 text-base">
        Search
      </Button>
    </form>
  );
}
