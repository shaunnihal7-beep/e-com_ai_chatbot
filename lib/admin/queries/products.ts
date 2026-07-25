import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import {
  categories,
  productColors,
  productImages,
  productSizes,
  products,
  reviews,
} from "@/db/schema";
import { DEFAULT_LOW_STOCK_THRESHOLD, PAGE_SIZE } from "@/lib/admin/constants";

export type ProductListFilters = {
  q?: string;
  status?: string;
  categoryId?: number;
  /** "low" limits the list to products with at least one low-stock size. */
  stock?: string;
  sort?: string;
  page?: number;
};

export type ProductListRow = {
  id: number;
  name: string;
  slug: string;
  status: string;
  priceCents: number;
  salePriceCents: number | null;
  gender: string;
  sku: string | null;
  categoryName: string | null;
  updatedAt: Date;
  image: string | null;
  colorCount: number;
  totalStock: number;
  lowStockCount: number;
  reviewCount: number;
};

/** The product's default colourway's first image — what the list thumbnails show. */
const thumbnailSql = sql<string | null>`(
  select pi.url
  from product_colors pc
  join product_images pi on pi.color_id = pc.id
  where pc.product_id = ${products.id}
  order by pc.is_default desc, pc.sort_order asc, pi.sort_order asc
  limit 1
)`;

const totalStockSql = sql<number>`(
  select coalesce(sum(ps.stock), 0)::int
  from product_colors pc
  join product_sizes ps on ps.color_id = pc.id
  where pc.product_id = ${products.id}
)`;

const lowStockCountSql = sql<number>`(
  select count(*)::int
  from product_colors pc
  join product_sizes ps on ps.color_id = pc.id
  where pc.product_id = ${products.id}
    and ps.stock <= coalesce(${products.lowStockThreshold}, ${DEFAULT_LOW_STOCK_THRESHOLD})
)`;

export async function listProducts(filters: ProductListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const conditions: SQL[] = [];

  if (filters.q?.trim()) {
    const term = `%${filters.q.trim()}%`;
    conditions.push(
      or(
        ilike(products.name, term),
        ilike(products.slug, term),
        ilike(products.subtitle, term),
        ilike(products.sku, term),
      )!,
    );
  }

  // "all" is the explicit opt-in to seeing archived rows; by default the list
  // shows drafts and published together but hides archived.
  if (filters.status && filters.status !== "all") {
    conditions.push(eq(products.status, filters.status));
  } else if (!filters.status) {
    conditions.push(sql`${products.status} <> 'archived'`);
  }

  if (filters.categoryId) conditions.push(eq(products.categoryId, filters.categoryId));
  if (filters.stock === "low") conditions.push(sql`${lowStockCountSql} > 0`);
  if (filters.stock === "out") conditions.push(sql`${totalStockSql} = 0`);

  const where = conditions.length ? and(...conditions) : undefined;

  const orderBy = (() => {
    switch (filters.sort) {
      case "name":
        return asc(products.name);
      case "price-asc":
        return asc(products.priceCents);
      case "price-desc":
        return desc(products.priceCents);
      case "oldest":
        return asc(products.createdAt);
      case "stock":
        return asc(totalStockSql);
      default:
        return desc(products.updatedAt);
    }
  })();

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        status: products.status,
        priceCents: products.priceCents,
        salePriceCents: products.salePriceCents,
        gender: products.gender,
        sku: products.sku,
        categoryName: categories.name,
        updatedAt: products.updatedAt,
        image: thumbnailSql,
        colorCount: sql<number>`(select count(*)::int from product_colors pc where pc.product_id = ${products.id})`,
        totalStock: totalStockSql,
        lowStockCount: lowStockCountSql,
        reviewCount: sql<number>`(select count(*)::int from reviews r where r.product_id = ${products.id})`,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(where)
      .orderBy(orderBy)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ n: count(products.id) }).from(products).where(where),
  ]);

  const total = Number(totalRow[0]?.n ?? 0);

  return {
    rows: rows as ProductListRow[],
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/** Counts for the status tabs above the list. */
export async function getProductStatusCounts() {
  const rows = await db
    .select({ status: products.status, n: count(products.id) })
    .from(products)
    .groupBy(products.status);

  const get = (s: string) => Number(rows.find((r) => r.status === s)?.n ?? 0);
  return {
    all: rows.reduce((sum, r) => sum + Number(r.n), 0),
    published: get("published"),
    draft: get("draft"),
    archived: get("archived"),
  };
}

/** Full product with colourways, images and size rows — the edit form's source. */
export async function getProductForEdit(id: number) {
  const product = await db.query.products.findFirst({ where: eq(products.id, id) });
  if (!product) return null;

  const colors = await db
    .select()
    .from(productColors)
    .where(eq(productColors.productId, id))
    .orderBy(desc(productColors.isDefault), asc(productColors.sortOrder));

  const colorIds = colors.map((c) => c.id);

  const [images, sizes] = await Promise.all([
    colorIds.length
      ? db
          .select()
          .from(productImages)
          .where(inArray(productImages.colorId, colorIds))
          .orderBy(asc(productImages.sortOrder))
      : Promise.resolve([]),
    colorIds.length
      ? db
          .select()
          .from(productSizes)
          .where(inArray(productSizes.colorId, colorIds))
          .orderBy(asc(productSizes.size))
      : Promise.resolve([]),
  ]);

  return {
    ...product,
    colors: colors.map((color) => ({
      ...color,
      images: images.filter((i) => i.colorId === color.id),
      sizes: sizes.filter((s) => s.colorId === color.id),
    })),
  };
}

export type ProductForEdit = NonNullable<Awaited<ReturnType<typeof getProductForEdit>>>;

export async function getAllCategories() {
  return db.select().from(categories).orderBy(asc(categories.path));
}

/** Every slug in use — the caller passes this to uniqueSlug(). */
export async function getTakenProductSlugs(): Promise<string[]> {
  const rows = await db.select({ slug: products.slug }).from(products);
  return rows.map((r) => r.slug);
}

export async function getProductReviewSummary(productId: number) {
  const [row] = await db
    .select({
      n: count(reviews.id),
      avg: sql<number>`coalesce(avg(${reviews.rating}), 0)::float`,
    })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.status, "approved")));

  return { count: Number(row?.n ?? 0), average: Number(row?.avg ?? 0) };
}
