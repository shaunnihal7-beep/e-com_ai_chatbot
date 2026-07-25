import "server-only";
import { and, asc, desc, eq, gte, inArray, lte, or, sql, ilike } from "drizzle-orm";

import { db } from "@/db";
import {
  categories,
  productColors,
  productImages,
  products,
  productSizes,
  reviews,
} from "@/db/schema";
import { descendantPaths } from "@/lib/taxonomy";
import type {
  ColorDetail,
  ProductCard,
  ProductDetail,
  ProductFilters,
  SortKey,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Rating aggregate                                                    */
/* ------------------------------------------------------------------ */

type RatingRow = { productId: number; avg: number; count: number };

/**
 * Only published products are ever exposed on the storefront. The CMS can put a
 * product back to draft (or archive it) and this one predicate takes it down
 * everywhere the public queries below reach.
 */
const publishedOnly = eq(products.status, "published");

async function ratingsByProduct(): Promise<Map<number, RatingRow>> {
  const rows = await db
    .select({
      productId: reviews.productId,
      avg: sql<string>`avg(${reviews.rating})`,
      count: sql<string>`count(*)`,
    })
    .from(reviews)
    // Ratings shown publicly must match the reviews shown publicly — approved.
    .where(eq(reviews.status, "approved"))
    .groupBy(reviews.productId);

  return new Map(
    rows.map((r) => [
      r.productId,
      {
        productId: r.productId,
        avg: Math.round(Number(r.avg) * 10) / 10,
        count: Number(r.count),
      },
    ]),
  );
}

/* ------------------------------------------------------------------ */
/* Card list                                                           */
/* ------------------------------------------------------------------ */

type RawProduct = Awaited<ReturnType<typeof fetchProductRows>>[number];

function fetchProductRows(where: ReturnType<typeof and> | undefined) {
  return db.query.products.findMany({
    where,
    with: {
      category: true,
      colors: {
        orderBy: [asc(productColors.sortOrder)],
        with: {
          images: { orderBy: [asc(productImages.sortOrder)] },
        },
      },
    },
  });
}

function toCard(row: RawProduct, ratings: Map<number, RatingRow>): ProductCard {
  const rating = ratings.get(row.id);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    subtitle: row.subtitle,
    priceCents: row.priceCents,
    salePriceCents: row.salePriceCents,
    isNew: row.isNew,
    isBestSeller: row.isBestSeller,
    categoryPath: row.category.path,
    categoryName: row.category.name,
    technologies: row.technologies,
    rating: rating?.avg ?? 0,
    reviewCount: rating?.count ?? 0,
    colors: row.colors.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      hex: c.hex,
      isDefault: c.isDefault,
      images: c.images.map((i) => ({ url: i.url, alt: i.alt })),
    })),
  };
}

/** Effective price — what the customer actually pays. */
const effectivePrice = (p: ProductCard) => p.salePriceCents ?? p.priceCents;

function sortCards(cards: ProductCard[], sort: SortKey = "featured"): ProductCard[] {
  const out = [...cards];
  switch (sort) {
    case "newest":
      return out.sort((a, b) => Number(b.isNew) - Number(a.isNew) || b.id - a.id);
    case "price-asc":
      return out.sort((a, b) => effectivePrice(a) - effectivePrice(b));
    case "price-desc":
      return out.sort((a, b) => effectivePrice(b) - effectivePrice(a));
    case "rating":
      return out.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    default:
      // Featured: best sellers first, then new, then catalogue order.
      return out.sort(
        (a, b) =>
          Number(b.isBestSeller) - Number(a.isBestSeller) ||
          Number(b.isNew) - Number(a.isNew) ||
          a.id - b.id,
      );
  }
}

/**
 * Products for a category path (including all descendants), or the whole
 * catalogue when `path` is omitted.
 */
export async function getProducts(
  path?: string,
  filters: ProductFilters = {},
): Promise<ProductCard[]> {
  let where;

  if (path) {
    const paths = descendantPaths(path);
    if (paths.length === 0) return [];
    const cats = await db
      .select({ id: categories.id })
      .from(categories)
      .where(inArray(categories.path, paths));
    if (cats.length === 0) return [];
    where = inArray(
      products.categoryId,
      cats.map((c) => c.id),
    );
  }

  const priceConditions = [];
  if (filters.minPrice !== undefined) {
    priceConditions.push(gte(products.priceCents, filters.minPrice));
  }
  if (filters.maxPrice !== undefined) {
    priceConditions.push(lte(products.priceCents, filters.maxPrice));
  }
  if (filters.onSale) {
    priceConditions.push(sql`${products.salePriceCents} is not null`);
  }

  const rows = await fetchProductRows(
    and(publishedOnly, where, ...priceConditions),
  );
  const ratings = await ratingsByProduct();
  let cards = rows.map((r) => toCard(r, ratings));

  // Colour filter matches on the colourway slug.
  if (filters.colors?.length) {
    const wanted = new Set(filters.colors);
    cards = cards.filter((c) => c.colors.some((col) => wanted.has(col.slug)));
  }

  // Size filter needs stock, which lives a table below the card query.
  if (filters.sizes?.length) {
    const inStock = await db
      .selectDistinct({ productId: productColors.productId })
      .from(productSizes)
      .innerJoin(productColors, eq(productSizes.colorId, productColors.id))
      .where(and(inArray(productSizes.size, filters.sizes), gte(productSizes.stock, 1)));
    const allowed = new Set(inStock.map((r) => r.productId));
    cards = cards.filter((c) => allowed.has(c.id));
  }

  return sortCards(cards, filters.sort);
}

/* ------------------------------------------------------------------ */
/* Detail                                                              */
/* ------------------------------------------------------------------ */

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const row = await db.query.products.findFirst({
    // Draft and archived products are not reachable by URL — unpublishing is a
    // real takedown, not just a hidden listing.
    where: and(eq(products.slug, slug), publishedOnly),
    with: {
      category: true,
      colors: {
        orderBy: [asc(productColors.sortOrder)],
        with: {
          images: { orderBy: [asc(productImages.sortOrder)] },
          sizes: { orderBy: [asc(productSizes.size)] },
        },
      },
      // Only approved reviews reach the storefront; the rest sit in moderation.
      reviews: {
        where: eq(reviews.status, "approved"),
        orderBy: [desc(reviews.createdAt)],
      },
    },
  });

  if (!row) return null;

  const breakdown: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of row.reviews) {
    breakdown[r.rating as 1 | 2 | 3 | 4 | 5]++;
  }
  const reviewCount = row.reviews.length;
  const rating = reviewCount
    ? Math.round((row.reviews.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10) / 10
    : 0;

  const colors: ColorDetail[] = row.colors.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    hex: c.hex,
    isDefault: c.isDefault,
    images: c.images.map((i) => ({ url: i.url, alt: i.alt })),
    sizes: c.sizes.map((s) => ({ size: s.size, stock: s.stock })),
  }));

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    subtitle: row.subtitle,
    description: row.description,
    story: row.story,
    priceCents: row.priceCents,
    salePriceCents: row.salePriceCents,
    isNew: row.isNew,
    isBestSeller: row.isBestSeller,
    categoryPath: row.category.path,
    categoryName: row.category.name,
    technologies: row.technologies,
    weightGrams: row.weightGrams,
    dropMm: row.dropMm,
    rating,
    reviewCount,
    colors,
    reviews: row.reviews.map((r) => ({
      id: r.id,
      author: r.author,
      rating: r.rating,
      title: r.title,
      body: r.body,
      verified: r.verified,
      images: r.images,
      reply: r.reply,
      replyAuthor: r.replyAuthor,
      createdAt: r.createdAt,
    })),
    ratingBreakdown: breakdown,
  };
}

/* ------------------------------------------------------------------ */
/* Curated lists                                                       */
/* ------------------------------------------------------------------ */

export async function getNewArrivals(limit = 8): Promise<ProductCard[]> {
  const rows = await fetchProductRows(and(publishedOnly, eq(products.isNew, true)));
  const ratings = await ratingsByProduct();
  return rows
    .map((r) => toCard(r, ratings))
    .sort((a, b) => b.id - a.id)
    .slice(0, limit);
}

export async function getBestSellers(limit = 8): Promise<ProductCard[]> {
  const rows = await fetchProductRows(and(publishedOnly, eq(products.isBestSeller, true)));
  const ratings = await ratingsByProduct();
  return rows
    .map((r) => toCard(r, ratings))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

export async function getRelatedProducts(
  productId: number,
  categoryPath: string,
  limit = 4,
): Promise<ProductCard[]> {
  // Walk up one level so a leaf category still has siblings to show.
  const parentPath = categoryPath.split("/").slice(0, -1).join("/") || categoryPath;
  const pool = await getProducts(parentPath);
  return pool.filter((p) => p.id !== productId).slice(0, limit);
}

export async function searchProducts(query: string, limit = 24): Promise<ProductCard[]> {
  const q = query.trim();
  if (!q) return [];

  const term = `%${q}%`;
  const rows = await fetchProductRows(
    and(
      or(
        ilike(products.name, term),
        ilike(products.subtitle, term),
        ilike(products.description, term),
        sql`exists (select 1 from unnest(${products.technologies}) t where t ilike ${term})`,
      ),
    ),
  );

  const ratings = await ratingsByProduct();
  const cards = rows.map((r) => toCard(r, ratings));

  // Name matches outrank description matches.
  const lower = q.toLowerCase();
  return cards
    .sort((a, b) => {
      const aScore = a.name.toLowerCase().includes(lower) ? 0 : 1;
      const bScore = b.name.toLowerCase().includes(lower) ? 0 : 1;
      return aScore - bScore || a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}

/** Facet values for the filter panel, scoped to the current category. */
export async function getFilterFacets(path?: string) {
  const cards = await getProducts(path);
  const colorMap = new Map<string, { slug: string; name: string; hex: string }>();
  for (const card of cards) {
    for (const c of card.colors) {
      if (!colorMap.has(c.slug)) {
        colorMap.set(c.slug, { slug: c.slug, name: c.name, hex: c.hex });
      }
    }
  }

  const prices = cards.map((c) => c.salePriceCents ?? c.priceCents);
  const productIds = cards.map((c) => c.id);

  const sizeRows = productIds.length
    ? await db
        .selectDistinct({ size: productSizes.size })
        .from(productSizes)
        .innerJoin(productColors, eq(productSizes.colorId, productColors.id))
        .where(inArray(productColors.productId, productIds))
        .orderBy(asc(productSizes.size))
    : [];

  return {
    colors: [...colorMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    sizes: sizeRows.map((r) => r.size),
    minPrice: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 0,
    total: cards.length,
  };
}
