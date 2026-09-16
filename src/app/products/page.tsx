import type { Metadata } from "next";

import { EmptyState } from "@/components/common/empty-state";
import { PageTitle } from "@/components/common/page-title";
import { Section } from "@/components/common/section";
import { ProductResults } from "@/components/products/product-results";
import { ProductSearchForm } from "@/components/products/product-search-form";
import { formatNumber } from "@/lib/format";
import { searchProducts } from "@/lib/metrics";
import { loadData } from "@/lib/server-data";

export const metadata: Metadata = { title: "Products" };

/** Without a search: the best sellers. With one: every match, up to this many. */
const TOP_PRODUCTS = 50;
const MAX_MATCHES = 200;

interface ProductsPageProps {
  searchParams: Promise<{ q?: string | string[] }>;
}

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function matchLine(count: number, query: string): string {
  return count === 1 ? `1 product matches "${query}"` : `${formatNumber(count)} products match "${query}"`;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const query = firstValue((await searchParams).q).trim();
  const data = await loadData();

  const matches = searchProducts(data, query);
  const products = matches.slice(0, query ? MAX_MATCHES : TOP_PRODUCTS);

  const title = query ? "Search Results" : `Top ${TOP_PRODUCTS} Products`;
  const description = query
    ? matches.length > MAX_MATCHES
      ? `${matchLine(matches.length, query)}. Showing the first ${MAX_MATCHES}.`
      : matchLine(matches.length, query)
    : `Showing ${formatNumber(products.length)} of ${formatNumber(data.products.length)} products. Search to find any product.`;

  return (
    <div className="flex flex-col gap-8 lg:gap-10">
      <PageTitle title="Products" subtitle="Find any product and see its price, cost, profit and stock." />

      <ProductSearchForm query={query} />

      <Section title={title} description={description} flush>
        {products.length > 0 ? (
          <ProductResults products={products} />
        ) : (
          <div className="px-5 pb-3 lg:px-6 lg:pb-4">
            <EmptyState title={`No products match "${query}"`} description="Try fewer words, or search by code or barcode." />
          </div>
        )}
      </Section>
    </div>
  );
}
