import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { blogCategories, blogPostTags, blogPosts, blogTags } from "@/db/schema";
import { PAGE_SIZE } from "@/lib/admin/constants";

export type PostListFilters = {
  q?: string;
  status?: string;
  categoryId?: number;
  tagId?: number;
  page?: number;
};

export async function listPosts(filters: PostListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const conditions: SQL[] = [];

  if (filters.q?.trim()) {
    const term = `%${filters.q.trim()}%`;
    conditions.push(
      or(ilike(blogPosts.title, term), ilike(blogPosts.slug, term), ilike(blogPosts.body, term))!,
    );
  }
  if (filters.status && filters.status !== "all") {
    conditions.push(eq(blogPosts.status, filters.status));
  }
  if (filters.categoryId) conditions.push(eq(blogPosts.categoryId, filters.categoryId));
  if (filters.tagId) {
    conditions.push(
      sql`exists (select 1 from blog_post_tags bpt where bpt.post_id = ${blogPosts.id} and bpt.tag_id = ${filters.tagId})`,
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        slug: blogPosts.slug,
        status: blogPosts.status,
        excerpt: blogPosts.excerpt,
        coverImage: blogPosts.coverImage,
        authorName: blogPosts.authorName,
        categoryName: blogCategories.name,
        categorySlug: blogCategories.slug,
        publishedAt: blogPosts.publishedAt,
        updatedAt: blogPosts.updatedAt,
        tagCount: sql<number>`(select count(*)::int from blog_post_tags bpt where bpt.post_id = ${blogPosts.id})`,
      })
      .from(blogPosts)
      .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
      .where(where)
      .orderBy(desc(blogPosts.updatedAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ n: count(blogPosts.id) }).from(blogPosts).where(where),
  ]);

  const total = Number(totalRow[0]?.n ?? 0);
  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getPostStatusCounts() {
  const rows = await db
    .select({ status: blogPosts.status, n: count(blogPosts.id) })
    .from(blogPosts)
    .groupBy(blogPosts.status);

  const get = (s: string) => Number(rows.find((r) => r.status === s)?.n ?? 0);
  return {
    all: rows.reduce((sum, r) => sum + Number(r.n), 0),
    published: get("published"),
    draft: get("draft"),
    archived: get("archived"),
  };
}

export async function getPostForEdit(id: number) {
  const post = await db.query.blogPosts.findFirst({ where: eq(blogPosts.id, id) });
  if (!post) return null;

  const tagRows = await db
    .select({ id: blogTags.id })
    .from(blogPostTags)
    .innerJoin(blogTags, eq(blogPostTags.tagId, blogTags.id))
    .where(eq(blogPostTags.postId, id));

  return { ...post, tagIds: tagRows.map((t) => t.id) };
}

export type PostForEdit = NonNullable<Awaited<ReturnType<typeof getPostForEdit>>>;

export async function getBlogCategories() {
  return db
    .select({
      id: blogCategories.id,
      slug: blogCategories.slug,
      name: blogCategories.name,
      description: blogCategories.description,
      sortOrder: blogCategories.sortOrder,
      postCount: sql<number>`(select count(*)::int from blog_posts bp where bp.category_id = ${blogCategories.id})`,
    })
    .from(blogCategories)
    .orderBy(asc(blogCategories.sortOrder), asc(blogCategories.name));
}

export async function getBlogTags() {
  return db
    .select({
      id: blogTags.id,
      slug: blogTags.slug,
      name: blogTags.name,
      postCount: sql<number>`(select count(*)::int from blog_post_tags bpt where bpt.tag_id = ${blogTags.id})`,
    })
    .from(blogTags)
    .orderBy(asc(blogTags.name));
}

export async function getTakenPostSlugs(): Promise<string[]> {
  const rows = await db.select({ slug: blogPosts.slug }).from(blogPosts);
  return rows.map((r) => r.slug);
}

/* ------------------------------------------------------------------ */
/* Storefront-facing                                                   */
/* ------------------------------------------------------------------ */

/** Published posts only — used by the public blog. */
export async function getPublishedPosts(options?: {
  categorySlug?: string;
  tagSlug?: string;
  limit?: number;
}) {
  const conditions: SQL[] = [eq(blogPosts.status, "published")];

  if (options?.categorySlug) {
    conditions.push(
      sql`exists (select 1 from blog_categories bc where bc.id = ${blogPosts.categoryId} and bc.slug = ${options.categorySlug})`,
    );
  }
  if (options?.tagSlug) {
    conditions.push(
      sql`exists (
        select 1 from blog_post_tags bpt
        join blog_tags bt on bt.id = bpt.tag_id
        where bpt.post_id = ${blogPosts.id} and bt.slug = ${options.tagSlug}
      )`,
    );
  }

  const query = db
    .select({
      id: blogPosts.id,
      title: blogPosts.title,
      slug: blogPosts.slug,
      excerpt: blogPosts.excerpt,
      body: blogPosts.body,
      coverImage: blogPosts.coverImage,
      authorName: blogPosts.authorName,
      publishedAt: blogPosts.publishedAt,
      categoryName: blogCategories.name,
      categorySlug: blogCategories.slug,
    })
    .from(blogPosts)
    .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
    .where(and(...conditions))
    .orderBy(desc(blogPosts.publishedAt));

  return options?.limit ? query.limit(options.limit) : query;
}

export async function getPublishedPostBySlug(slug: string) {
  const [post] = await db
    .select({
      id: blogPosts.id,
      title: blogPosts.title,
      slug: blogPosts.slug,
      excerpt: blogPosts.excerpt,
      body: blogPosts.body,
      coverImage: blogPosts.coverImage,
      authorName: blogPosts.authorName,
      publishedAt: blogPosts.publishedAt,
      seoTitle: blogPosts.seoTitle,
      seoDescription: blogPosts.seoDescription,
      categoryName: blogCategories.name,
      categorySlug: blogCategories.slug,
    })
    .from(blogPosts)
    .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")))
    .limit(1);

  if (!post) return null;

  const tags = await db
    .select({ name: blogTags.name, slug: blogTags.slug })
    .from(blogPostTags)
    .innerJoin(blogTags, eq(blogPostTags.tagId, blogTags.id))
    .where(eq(blogPostTags.postId, post.id));

  return { ...post, tags };
}

/** Categories and tags that actually have published posts behind them. */
export async function getPublicTaxonomy() {
  const [cats, tags] = await Promise.all([
    db
      .select({
        name: blogCategories.name,
        slug: blogCategories.slug,
        n: sql<number>`(select count(*)::int from blog_posts bp where bp.category_id = ${blogCategories.id} and bp.status = 'published')`,
      })
      .from(blogCategories)
      .orderBy(asc(blogCategories.sortOrder)),
    db
      .select({
        name: blogTags.name,
        slug: blogTags.slug,
        n: sql<number>`(select count(*)::int from blog_post_tags bpt join blog_posts bp on bp.id = bpt.post_id where bpt.tag_id = ${blogTags.id} and bp.status = 'published')`,
      })
      .from(blogTags)
      .orderBy(asc(blogTags.name)),
  ]);

  return {
    categories: cats.filter((c) => Number(c.n) > 0),
    tags: tags.filter((t) => Number(t.n) > 0),
  };
}

/** Replaces a post's tag set in one pass. */
export async function setPostTags(postId: number, tagIds: number[]) {
  await db.delete(blogPostTags).where(eq(blogPostTags.postId, postId));
  if (tagIds.length) {
    await db.insert(blogPostTags).values(tagIds.map((tagId) => ({ postId, tagId })));
  }
}

export async function getTagsByIds(ids: number[]) {
  if (!ids.length) return [];
  return db.select().from(blogTags).where(inArray(blogTags.id, ids));
}
