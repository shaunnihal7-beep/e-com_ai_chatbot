"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { blogCategories, blogPostTags, blogPosts, blogTags, type ContentStatus } from "@/db/schema";
import { logActivity } from "@/lib/admin/activity";
import { requireAdminAction } from "@/lib/admin/auth";
import { excerptFrom } from "@/lib/markdown";
import { slugify, uniqueSlug } from "@/lib/slug";
import { getTakenPostSlugs, setPostTags } from "@/lib/admin/queries/blog";

export type ActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
  id?: number;
};

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

function revalidateBlog(slug?: string) {
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  if (slug) revalidatePath(`/blog/${slug}`);
}

const postSchema = z.object({
  title: z.string().trim().min(2, "Give the post a title.").max(160),
  slug: z.string().trim().max(80).optional(),
  excerpt: z.string().trim().max(300).optional(),
  body: z.string().trim().min(10, "Write the post."),
  coverImage: z.string().trim().optional(),
  status: z.enum(["draft", "published", "archived"]),
  categoryId: z.string().trim().optional(),
  authorName: z.string().trim().min(2, "Add an author name.").max(80),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(180).optional(),
});

function readPostForm(formData: FormData) {
  return postSchema.safeParse({
    title: formData.get("title") ?? "",
    slug: formData.get("slug") ?? "",
    excerpt: formData.get("excerpt") ?? "",
    body: formData.get("body") ?? "",
    coverImage: formData.get("coverImage") ?? "",
    status: formData.get("status") ?? "draft",
    categoryId: formData.get("categoryId") ?? "",
    authorName: formData.get("authorName") ?? "",
    seoTitle: formData.get("seoTitle") ?? "",
    seoDescription: formData.get("seoDescription") ?? "",
  });
}

/** Tag checkboxes arrive as repeated `tagIds` entries. */
function readTagIds(formData: FormData): number[] {
  return formData
    .getAll("tagIds")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0);
}

export async function createPostAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminAction();
  const parsed = readPostForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const data = parsed.data;
  const slug = uniqueSlug(data.slug || data.title, await getTakenPostSlugs());

  const [created] = await db
    .insert(blogPosts)
    .values({
      slug,
      title: data.title,
      // An empty excerpt is derived from the body rather than left blank —
      // the blog index always has something to show.
      excerpt: data.excerpt || excerptFrom(data.body),
      body: data.body,
      coverImage: data.coverImage || null,
      status: data.status,
      categoryId: data.categoryId ? Number(data.categoryId) : null,
      authorId: admin.id,
      authorName: data.authorName,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      publishedAt: data.status === "published" ? new Date() : null,
      updatedAt: new Date(),
    })
    .returning();

  await setPostTags(created.id, readTagIds(formData));

  await logActivity(admin, "created", "post", `Created post “${data.title}”`, created.id);
  revalidateBlog(slug);

  return { ok: true, message: "Post created.", id: created.id };
}

export async function updatePostAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminAction();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { ok: false, message: "Unknown post." };

  const parsed = readPostForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const existing = await db.query.blogPosts.findFirst({ where: eq(blogPosts.id, id) });
  if (!existing) return { ok: false, message: "That post no longer exists." };

  const data = parsed.data;

  let slug = existing.slug;
  const requested = slugify(data.slug || data.title);
  if (requested && requested !== existing.slug) {
    slug = uniqueSlug(requested, (await getTakenPostSlugs()).filter((s) => s !== existing.slug));
  }

  await db
    .update(blogPosts)
    .set({
      slug,
      title: data.title,
      excerpt: data.excerpt || excerptFrom(data.body),
      body: data.body,
      coverImage: data.coverImage || null,
      status: data.status,
      categoryId: data.categoryId ? Number(data.categoryId) : null,
      authorName: data.authorName,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      publishedAt:
        data.status === "published" ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
      archivedAt: data.status === "archived" ? (existing.archivedAt ?? new Date()) : null,
      updatedAt: new Date(),
    })
    .where(eq(blogPosts.id, id));

  await setPostTags(id, readTagIds(formData));

  await logActivity(admin, "updated", "post", `Updated post “${data.title}”`, id);
  revalidateBlog(slug);
  if (slug !== existing.slug) revalidateBlog(existing.slug);

  return { ok: true, message: "Changes saved.", id };
}

export async function setPostStatusAction(id: number, status: ContentStatus) {
  const admin = await requireAdminAction();

  const existing = await db.query.blogPosts.findFirst({ where: eq(blogPosts.id, id) });
  if (!existing) return { ok: false, message: "That post no longer exists." };

  await db
    .update(blogPosts)
    .set({
      status,
      publishedAt: status === "published" ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
      archivedAt: status === "archived" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(blogPosts.id, id));

  const verb = status === "published" ? "published" : status === "archived" ? "archived" : "unpublished";
  await logActivity(admin, verb, "post", `${verb} “${existing.title}”`, id);
  revalidateBlog(existing.slug);

  return { ok: true, message: `Post ${verb}.` };
}

export async function duplicatePostAction(id: number) {
  const admin = await requireAdminAction();

  const source = await db.query.blogPosts.findFirst({ where: eq(blogPosts.id, id) });
  if (!source) return { ok: false, message: "That post no longer exists." };

  const slug = uniqueSlug(`${source.slug}-copy`, await getTakenPostSlugs());

  const [copy] = await db
    .insert(blogPosts)
    .values({
      slug,
      title: `${source.title} (Copy)`,
      excerpt: source.excerpt,
      body: source.body,
      coverImage: source.coverImage,
      status: "draft",
      categoryId: source.categoryId,
      authorId: admin.id,
      authorName: source.authorName,
      seoTitle: source.seoTitle,
      seoDescription: source.seoDescription,
      publishedAt: null,
      updatedAt: new Date(),
    })
    .returning();

  const tags = await db
    .select()
    .from(blogPostTags)
    .where(eq(blogPostTags.postId, id));
  if (tags.length) {
    await db.insert(blogPostTags).values(tags.map((t) => ({ postId: copy.id, tagId: t.tagId })));
  }

  await logActivity(admin, "duplicated", "post", `Duplicated “${source.title}”`, copy.id);
  revalidateBlog();

  return { ok: true, message: "Post duplicated as a draft.", id: copy.id };
}

export async function deletePostAction(id: number) {
  const admin = await requireAdminAction();

  const existing = await db.query.blogPosts.findFirst({ where: eq(blogPosts.id, id) });
  if (!existing) return { ok: false, message: "That post no longer exists." };

  await db.delete(blogPosts).where(eq(blogPosts.id, id));

  await logActivity(admin, "deleted", "post", `Deleted post “${existing.title}”`, id);
  revalidateBlog(existing.slug);

  return { ok: true, message: "Post deleted." };
}

/* ------------------------------------------------------------------ */
/* Categories & tags                                                   */
/* ------------------------------------------------------------------ */

const taxonomySchema = z.object({
  name: z.string().trim().min(2, "Give it a name.").max(60),
  slug: z.string().trim().max(80).optional(),
  description: z.string().trim().max(300).optional(),
});

export async function saveCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminAction();

  const idRaw = formData.get("id");
  const id = idRaw ? Number(idRaw) : null;

  const parsed = taxonomySchema.safeParse({
    name: formData.get("name") ?? "",
    slug: formData.get("slug") ?? "",
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the category.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const existingSlugs = (await db.select({ slug: blogCategories.slug }).from(blogCategories)).map(
    (r) => r.slug,
  );

  if (id) {
    const current = await db.query.blogCategories.findFirst({
      where: eq(blogCategories.id, id),
    });
    if (!current) return { ok: false, message: "That category no longer exists." };

    const requested = slugify(parsed.data.slug || parsed.data.name);
    const slug =
      requested === current.slug
        ? current.slug
        : uniqueSlug(requested, existingSlugs.filter((s) => s !== current.slug));

    await db
      .update(blogCategories)
      .set({ name: parsed.data.name, slug, description: parsed.data.description || null })
      .where(eq(blogCategories.id, id));

    await logActivity(admin, "updated", "category", `Updated category “${parsed.data.name}”`, id);
  } else {
    const [created] = await db
      .insert(blogCategories)
      .values({
        name: parsed.data.name,
        slug: uniqueSlug(parsed.data.slug || parsed.data.name, existingSlugs),
        description: parsed.data.description || null,
      })
      .returning();

    await logActivity(admin, "created", "category", `Created category “${parsed.data.name}”`, created.id);
  }

  revalidateBlog();
  return { ok: true, message: id ? "Category updated." : "Category created." };
}

export async function deleteCategoryAction(id: number) {
  const admin = await requireAdminAction();

  const existing = await db.query.blogCategories.findFirst({
    where: eq(blogCategories.id, id),
  });
  if (!existing) return { ok: false, message: "That category no longer exists." };

  // Posts survive: blog_posts.category_id is ON DELETE SET NULL, so removing a
  // category un-files its posts rather than deleting them.
  await db.delete(blogCategories).where(eq(blogCategories.id, id));

  await logActivity(admin, "deleted", "category", `Deleted category “${existing.name}”`, id);
  revalidateBlog();

  return { ok: true, message: "Category deleted. Its posts are now uncategorised." };
}

export async function saveTagAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminAction();

  const idRaw = formData.get("id");
  const id = idRaw ? Number(idRaw) : null;

  const parsed = taxonomySchema.safeParse({
    name: formData.get("name") ?? "",
    slug: formData.get("slug") ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the tag.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const existingSlugs = (await db.select({ slug: blogTags.slug }).from(blogTags)).map((r) => r.slug);

  if (id) {
    const current = await db.query.blogTags.findFirst({ where: eq(blogTags.id, id) });
    if (!current) return { ok: false, message: "That tag no longer exists." };

    const requested = slugify(parsed.data.slug || parsed.data.name);
    const slug =
      requested === current.slug
        ? current.slug
        : uniqueSlug(requested, existingSlugs.filter((s) => s !== current.slug));

    await db.update(blogTags).set({ name: parsed.data.name, slug }).where(eq(blogTags.id, id));
    await logActivity(admin, "updated", "tag", `Updated tag “${parsed.data.name}”`, id);
  } else {
    const [created] = await db
      .insert(blogTags)
      .values({
        name: parsed.data.name,
        slug: uniqueSlug(parsed.data.slug || parsed.data.name, existingSlugs),
      })
      .returning();

    await logActivity(admin, "created", "tag", `Created tag “${parsed.data.name}”`, created.id);
  }

  revalidateBlog();
  return { ok: true, message: id ? "Tag updated." : "Tag created." };
}

export async function deleteTagAction(id: number) {
  const admin = await requireAdminAction();

  const existing = await db.query.blogTags.findFirst({ where: eq(blogTags.id, id) });
  if (!existing) return { ok: false, message: "That tag no longer exists." };

  await db.delete(blogTags).where(eq(blogTags.id, id));

  await logActivity(admin, "deleted", "tag", `Deleted tag “${existing.name}”`, id);
  revalidateBlog();

  return { ok: true, message: "Tag deleted." };
}
