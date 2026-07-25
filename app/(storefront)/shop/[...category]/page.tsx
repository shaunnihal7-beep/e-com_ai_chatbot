import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ListingPage, type ListingSearchParams } from "@/components/product/listing-page";
import { findByPath, flattenTaxonomy } from "@/lib/taxonomy";

type Params = { category: string[] };

/** Every category page is known at build time — pre-render all of them. */
export function generateStaticParams(): Params[] {
  return flattenTaxonomy().map((node) => ({ category: node.path.split("/") }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const node = findByPath((await params).category.join("/"));
  if (!node) return { title: "Not found" };

  return {
    title: node.name,
    description: node.description,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<ListingSearchParams>;
}) {
  const path = (await params).category.join("/");

  // Anything not in the taxonomy is a genuine 404, not an empty listing.
  if (!findByPath(path)) notFound();

  return <ListingPage path={path} searchParams={await searchParams} />;
}
