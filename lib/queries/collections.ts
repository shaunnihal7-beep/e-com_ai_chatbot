import "server-only";
import { asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { collectionProducts, collections } from "@/db/schema";
import { getProducts } from "./products";
import type { ProductCard } from "@/lib/types";

export type CollectionView = {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  isFeatured: boolean;
  products: ProductCard[];
};

/** One catalogue read, sliced per collection — avoids an N+1 per collection. */
async function attachProducts(
  rows: (typeof collections.$inferSelect)[],
): Promise<CollectionView[]> {
  if (rows.length === 0) return [];

  const links = await db
    .select()
    .from(collectionProducts)
    .where(
      inArray(
        collectionProducts.collectionId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(asc(collectionProducts.sortOrder));

  const all = await getProducts();
  const byId = new Map(all.map((p) => [p.id, p]));

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    isFeatured: row.isFeatured,
    products: links
      .filter((l) => l.collectionId === row.id)
      .map((l) => byId.get(l.productId))
      .filter((p): p is ProductCard => Boolean(p)),
  }));
}

export async function getCollections(): Promise<CollectionView[]> {
  const rows = await db
    .select()
    .from(collections)
    .orderBy(asc(collections.sortOrder));
  return attachProducts(rows);
}

export async function getCollectionBySlug(slug: string): Promise<CollectionView | null> {
  const rows = await db.select().from(collections).where(eq(collections.slug, slug));
  const [view] = await attachProducts(rows);
  return view ?? null;
}

export async function getFeaturedCollection(): Promise<CollectionView | null> {
  const all = await getCollections();
  return all.find((c) => c.isFeatured) ?? all[0] ?? null;
}
