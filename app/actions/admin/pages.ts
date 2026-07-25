"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { pages, type ContentStatus } from "@/db/schema";
import { logActivity } from "@/lib/admin/activity";
import { requireAdminAction } from "@/lib/admin/auth";
import { isReservedSlug, slugify, uniqueSlug } from "@/lib/slug";
import { getTakenPageSlugs } from "@/lib/admin/queries/pages";

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

function revalidatePage(slug?: string) {
  revalidatePath("/admin/pages");
  // The footer lists published pages, so its layout has to refresh too.
  revalidatePath("/", "layout");
  if (slug) revalidatePath(`/${slug}`);
}

const pageSchema = z.object({
  title: z.string().trim().min(2, "Give the page a title.").max(120),
  slug: z.string().trim().max(80).optional(),
  body: z.string().trim().min(10, "Write the page content."),
  template: z.enum(["page", "faq"]),
  status: z.enum(["draft", "published", "archived"]),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(180).optional(),
  showInFooter: z.coerce.boolean().optional(),
  sortOrder: z.string().trim().optional(),
});

function readPageForm(formData: FormData) {
  return pageSchema.safeParse({
    title: formData.get("title") ?? "",
    slug: formData.get("slug") ?? "",
    body: formData.get("body") ?? "",
    template: formData.get("template") ?? "page",
    status: formData.get("status") ?? "draft",
    seoTitle: formData.get("seoTitle") ?? "",
    seoDescription: formData.get("seoDescription") ?? "",
    showInFooter: formData.get("showInFooter") === "on",
    sortOrder: formData.get("sortOrder") ?? "",
  });
}

export async function createPageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminAction();
  const parsed = readPageForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const data = parsed.data;
  const requested = slugify(data.slug || data.title);

  // A page at /cart or /shop would never be reachable — the storefront route
  // wins — so reject it here rather than creating a dead URL.
  if (isReservedSlug(requested)) {
    return {
      ok: false,
      message: `"/${requested}" is used by the storefront. Choose another address.`,
      fieldErrors: { slug: "This address is reserved." },
    };
  }

  const slug = uniqueSlug(requested, await getTakenPageSlugs());

  const [created] = await db
    .insert(pages)
    .values({
      slug,
      title: data.title,
      body: data.body,
      template: data.template,
      status: data.status,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      showInFooter: Boolean(data.showInFooter),
      sortOrder: Number(data.sortOrder) || 0,
      publishedAt: data.status === "published" ? new Date() : null,
      updatedAt: new Date(),
    })
    .returning();

  await logActivity(admin, "created", "page", `Created page “${data.title}”`, created.id);
  revalidatePage(slug);

  return { ok: true, message: "Page created.", id: created.id };
}

export async function updatePageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminAction();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { ok: false, message: "Unknown page." };

  const parsed = readPageForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const existing = await db.query.pages.findFirst({ where: eq(pages.id, id) });
  if (!existing) return { ok: false, message: "That page no longer exists." };

  const data = parsed.data;
  let slug = existing.slug;
  const requested = slugify(data.slug || data.title);

  if (requested && requested !== existing.slug) {
    if (isReservedSlug(requested)) {
      return {
        ok: false,
        message: `"/${requested}" is used by the storefront. Choose another address.`,
        fieldErrors: { slug: "This address is reserved." },
      };
    }
    slug = uniqueSlug(requested, (await getTakenPageSlugs()).filter((s) => s !== existing.slug));
  }

  await db
    .update(pages)
    .set({
      slug,
      title: data.title,
      body: data.body,
      template: data.template,
      status: data.status,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      showInFooter: Boolean(data.showInFooter),
      sortOrder: Number(data.sortOrder) || 0,
      publishedAt:
        data.status === "published" ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
      updatedAt: new Date(),
    })
    .where(eq(pages.id, id));

  await logActivity(admin, "updated", "page", `Updated page “${data.title}”`, id);
  revalidatePage(slug);
  if (slug !== existing.slug) revalidatePage(existing.slug);

  return { ok: true, message: "Changes saved.", id };
}

export async function setPageStatusAction(id: number, status: ContentStatus) {
  const admin = await requireAdminAction();

  const existing = await db.query.pages.findFirst({ where: eq(pages.id, id) });
  if (!existing) return { ok: false, message: "That page no longer exists." };

  await db
    .update(pages)
    .set({
      status,
      publishedAt: status === "published" ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
      updatedAt: new Date(),
    })
    .where(eq(pages.id, id));

  const verb = status === "published" ? "published" : status === "archived" ? "archived" : "unpublished";
  await logActivity(admin, verb, "page", `${verb} “${existing.title}”`, id);
  revalidatePage(existing.slug);

  return { ok: true, message: `Page ${verb}.` };
}

export async function duplicatePageAction(id: number) {
  const admin = await requireAdminAction();

  const source = await db.query.pages.findFirst({ where: eq(pages.id, id) });
  if (!source) return { ok: false, message: "That page no longer exists." };

  const slug = uniqueSlug(`${source.slug}-copy`, await getTakenPageSlugs());

  const [copy] = await db
    .insert(pages)
    .values({
      slug,
      title: `${source.title} (Copy)`,
      body: source.body,
      template: source.template,
      status: "draft",
      seoTitle: source.seoTitle,
      seoDescription: source.seoDescription,
      showInFooter: false,
      sortOrder: source.sortOrder,
      publishedAt: null,
      updatedAt: new Date(),
    })
    .returning();

  await logActivity(admin, "duplicated", "page", `Duplicated “${source.title}”`, copy.id);
  revalidatePage();

  return { ok: true, message: "Page duplicated as a draft.", id: copy.id };
}

export async function deletePageAction(id: number) {
  const admin = await requireAdminAction();

  const existing = await db.query.pages.findFirst({ where: eq(pages.id, id) });
  if (!existing) return { ok: false, message: "That page no longer exists." };

  await db.delete(pages).where(eq(pages.id, id));

  await logActivity(admin, "deleted", "page", `Deleted page “${existing.title}”`, id);
  revalidatePage(existing.slug);

  return { ok: true, message: "Page deleted." };
}
