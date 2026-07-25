import "server-only";
import { and, asc, count, eq, ilike, or, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { pages } from "@/db/schema";

export type PageListFilters = { q?: string; status?: string };

export async function listPages(filters: PageListFilters = {}) {
  const conditions: SQL[] = [];

  if (filters.q?.trim()) {
    const term = `%${filters.q.trim()}%`;
    conditions.push(or(ilike(pages.title, term), ilike(pages.slug, term))!);
  }
  if (filters.status && filters.status !== "all") {
    conditions.push(eq(pages.status, filters.status));
  }

  return db
    .select()
    .from(pages)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(pages.sortOrder), asc(pages.title));
}

export async function getPageStatusCounts() {
  const rows = await db
    .select({ status: pages.status, n: count(pages.id) })
    .from(pages)
    .groupBy(pages.status);

  const get = (s: string) => Number(rows.find((r) => r.status === s)?.n ?? 0);
  return {
    all: rows.reduce((sum, r) => sum + Number(r.n), 0),
    published: get("published"),
    draft: get("draft"),
    archived: get("archived"),
  };
}

export async function getPageById(id: number) {
  return db.query.pages.findFirst({ where: eq(pages.id, id) });
}

/** Storefront lookup — published only. */
export async function getPublishedPage(slug: string) {
  return db.query.pages.findFirst({
    where: and(eq(pages.slug, slug), eq(pages.status, "published")),
  });
}

export async function getFooterPages() {
  return db
    .select({ slug: pages.slug, title: pages.title })
    .from(pages)
    .where(and(eq(pages.status, "published"), eq(pages.showInFooter, true)))
    .orderBy(asc(pages.sortOrder), asc(pages.title));
}

export async function getTakenPageSlugs(): Promise<string[]> {
  const rows = await db.select({ slug: pages.slug }).from(pages);
  return rows.map((r) => r.slug);
}
