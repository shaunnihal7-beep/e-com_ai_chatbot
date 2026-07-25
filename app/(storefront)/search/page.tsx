import type { Metadata } from "next";
import Link from "next/link";

import { searchProducts } from "@/lib/queries/products";
import { ProductGrid, EmptyState } from "@/components/product/product-grid";
import { Reveal, SplitWords } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { taxonomy } from "@/lib/taxonomy";

export const metadata: Metadata = {
  title: "Search",
  description: "Search the Veloce range.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q?.trim() ?? "";
  const results = query ? await searchProducts(query, 48) : [];

  return (
    <div className="container-page pb-24 pt-24 md:pt-32">
      <header className="pb-12">
        <p className="text-eyebrow text-brand">Search</p>
        <h1 className="mt-4 text-display-lg">
          {query ? <SplitWords text={`"${query}"`} /> : <SplitWords text="Search" />}
        </h1>
        {query && (
          <Reveal delay={0.15} y={12}>
            <p className="mt-4 text-muted-foreground">
              {results.length} {results.length === 1 ? "result" : "results"}
            </p>
          </Reveal>
        )}
      </header>

      {!query ? (
        <div>
          <p className="text-muted-foreground">
            Use the search icon in the header, or jump straight to a category.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {taxonomy.flatMap((node) => [node, ...(node.children ?? [])]).map((node) => (
              <Link
                key={node.path}
                href={`/shop/${node.path}`}
                className="rounded-full border border-border px-4 py-2 text-sm transition-colors hover:border-foreground"
              >
                {node.name}
              </Link>
            ))}
          </div>
        </div>
      ) : results.length === 0 ? (
        <EmptyState
          title="No matches"
          message={`Nothing in the range matches "${query}". Try a sport, a technology, or a shoe name.`}
          action={
            <ButtonLink className="h-12 rounded-full px-8" href="/shop">
              Browse everything
            </ButtonLink>
          }
        />
      ) : (
        <ProductGrid products={results} />
      )}
    </div>
  );
}
