import Link from "next/link";

import { getFilterFacets, getProducts } from "@/lib/queries/products";
import { breadcrumbsFor, findByPath, taxonomy } from "@/lib/taxonomy";
import type { ProductFilters, SortKey } from "@/lib/types";
import { ButtonLink } from "@/components/ui/button-link";
import { Reveal, SplitWords } from "@/components/motion/reveal";
import { FilterBar } from "./filter-bar";
import { EmptyState, ProductGrid } from "./product-grid";

export type ListingSearchParams = {
  size?: string | string[];
  color?: string | string[];
  sort?: string;
  sale?: string;
};

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Shared body for /shop and every /shop/[...category] route.
 * `path` undefined means "the whole catalogue".
 */
export async function ListingPage({
  path,
  searchParams,
}: {
  path?: string;
  searchParams: ListingSearchParams;
}) {
  const node = path ? findByPath(path) : undefined;

  const filters: ProductFilters = {
    sizes: toArray(searchParams.size).map(Number).filter(Number.isFinite),
    colors: toArray(searchParams.color),
    onSale: searchParams.sale === "1",
    sort: (searchParams.sort as SortKey) ?? "featured",
  };

  const [products, facets] = await Promise.all([
    getProducts(path, filters),
    getFilterFacets(path),
  ]);

  const title = node?.name ?? "All Shoes";
  const tagline = node?.tagline ?? "The whole range";
  const description =
    node?.description ??
    "Every Veloce shoe in one place. Filter by sport, size or colour to narrow it down.";

  const crumbs = path ? breadcrumbsFor(path) : [];
  const children = node?.children ?? (path ? [] : taxonomy);

  return (
    <div className="container-page pb-24 pt-24 md:pt-32">
      {/* Header */}
      <header className="pb-8 md:pb-12">
        {crumbs.length > 1 && (
          <nav aria-label="Breadcrumb" className="mb-5">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              {crumbs.slice(0, -1).map((crumb) => (
                <li key={crumb.href}>
                  <Link href={crumb.href} className="transition-colors hover:text-foreground">
                    {crumb.name}
                  </Link>
                  <span className="ml-2">/</span>
                </li>
              ))}
              <li className="text-foreground">{crumbs.at(-1)?.name}</li>
            </ol>
          </nav>
        )}

        <p className="text-eyebrow text-brand">{tagline}</p>
        <h1 className="mt-4 text-display-lg">
          <SplitWords text={title} />
        </h1>
        <Reveal delay={0.15} y={16}>
          <p className="mt-5 max-w-xl text-body-lg text-muted-foreground">{description}</p>
        </Reveal>

        {/* Sub-category pills */}
        {children.length > 0 && (
          <Reveal delay={0.25} y={12}>
            <div className="no-scrollbar mt-8 flex gap-2 overflow-x-auto">
              {children.map((child) => (
                <Link
                  key={child.path}
                  href={`/shop/${child.path}`}
                  className="shrink-0 rounded-full border border-border px-4 py-2 text-sm transition-colors hover:border-foreground"
                >
                  {child.name}
                </Link>
              ))}
            </div>
          </Reveal>
        )}
      </header>

      <FilterBar facets={facets} count={products.length} />

      <div className="pt-10">
        {products.length === 0 ? (
          <EmptyState
            title="Nothing matches"
            message="No products fit those filters. Try clearing one of them, or browse the full range."
            action={
              <ButtonLink
                className="h-12 rounded-full px-8"
                href={path ? `/shop/${path}` : "/shop"}
              >
                Clear filters
              </ButtonLink>
            }
          />
        ) : (
          <ProductGrid products={products} />
        )}
      </div>
    </div>
  );
}
