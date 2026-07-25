import "server-only";
import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { products, reviews } from "@/db/schema";
import { PAGE_SIZE } from "@/lib/admin/constants";

export type ReviewListFilters = {
  q?: string;
  status?: string;
  rating?: number;
  productId?: number;
  page?: number;
};

export async function listReviews(filters: ReviewListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const conditions: SQL[] = [];

  if (filters.q?.trim()) {
    const term = `%${filters.q.trim()}%`;
    conditions.push(
      or(
        ilike(reviews.author, term),
        ilike(reviews.title, term),
        ilike(reviews.body, term),
        ilike(products.name, term),
      )!,
    );
  }
  if (filters.status && filters.status !== "all") {
    conditions.push(eq(reviews.status, filters.status));
  }
  if (filters.rating) conditions.push(eq(reviews.rating, filters.rating));
  if (filters.productId) conditions.push(eq(reviews.productId, filters.productId));

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: reviews.id,
        productId: reviews.productId,
        productName: products.name,
        productSlug: products.slug,
        author: reviews.author,
        email: reviews.email,
        rating: reviews.rating,
        title: reviews.title,
        body: reviews.body,
        verified: reviews.verified,
        status: reviews.status,
        images: reviews.images,
        reply: reviews.reply,
        replyAuthor: reviews.replyAuthor,
        repliedAt: reviews.repliedAt,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .innerJoin(products, eq(reviews.productId, products.id))
      .where(where)
      // Pending first: the moderation queue is the point of this screen.
      .orderBy(sql`case when ${reviews.status} = 'pending' then 0 else 1 end`, desc(reviews.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ n: count(reviews.id) })
      .from(reviews)
      .innerJoin(products, eq(reviews.productId, products.id))
      .where(where),
  ]);

  const total = Number(totalRow[0]?.n ?? 0);
  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getReviewStatusCounts() {
  const rows = await db
    .select({ status: reviews.status, n: count(reviews.id) })
    .from(reviews)
    .groupBy(reviews.status);

  const get = (s: string) => Number(rows.find((r) => r.status === s)?.n ?? 0);
  return {
    all: rows.reduce((sum, r) => sum + Number(r.n), 0),
    pending: get("pending"),
    approved: get("approved"),
    rejected: get("rejected"),
  };
}

export async function getRatingBreakdown() {
  const rows = await db
    .select({ rating: reviews.rating, n: count(reviews.id) })
    .from(reviews)
    .where(eq(reviews.status, "approved"))
    .groupBy(reviews.rating);

  const counts = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: Number(rows.find((r) => r.rating === rating)?.n ?? 0),
  }));
  const total = counts.reduce((sum, c) => sum + c.count, 0);
  const average = total
    ? counts.reduce((sum, c) => sum + c.rating * c.count, 0) / total
    : 0;

  return { counts, total, average };
}
