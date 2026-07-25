"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  productColors,
  productImages,
  productSizes,
  products,
  type ContentStatus,
} from "@/db/schema";
import { logActivity } from "@/lib/admin/activity";
import { requireAdminAction } from "@/lib/admin/auth";
import { SIZE_RUN } from "@/lib/admin/constants";
import { slugify, uniqueSlug } from "@/lib/slug";
import { getTakenProductSlugs } from "@/lib/admin/queries/products";

export type ActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
  /** Set on create so the client can navigate to the new record. */
  id?: number;
};

/** Refreshes every surface a catalogue edit can appear on. */
function revalidateProduct(slug?: string) {
  revalidatePath("/admin/products");
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/shop", "layout");
  if (slug) revalidatePath(`/product/${slug}`);
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

/** "129.99" and "129" both become integer cents. */
const priceField = z
  .string()
  .trim()
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Enter a price like 129 or 129.99")
  .transform((v) => Math.round(Number(v) * 100));

const optionalPriceField = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || /^\d+(\.\d{1,2})?$/.test(v), "Enter a price like 99 or 99.99")
  .transform((v) => (v === null ? null : Math.round(Number(v) * 100)));

const productSchema = z
  .object({
    name: z.string().trim().min(2, "Give the product a name.").max(120),
    slug: z.string().trim().max(80).optional(),
    subtitle: z.string().trim().min(2, "Add a short description.").max(200),
    description: z.string().trim().min(10, "Add a description.").max(4000),
    story: z.string().trim().max(4000).optional(),
    priceCents: priceField,
    salePriceCents: optionalPriceField,
    categoryId: z.coerce.number().int().positive("Choose a category."),
    gender: z.enum(["men", "women", "unisex", "kids"]),
    status: z.enum(["draft", "published", "archived"]),
    sku: z.string().trim().max(60).optional(),
    technologies: z.string().trim().optional(),
    weightGrams: z.string().trim().optional(),
    dropMm: z.string().trim().optional(),
    lowStockThreshold: z.string().trim().optional(),
    seoTitle: z.string().trim().max(70).optional(),
    seoDescription: z.string().trim().max(180).optional(),
    isNew: z.coerce.boolean().optional(),
    isBestSeller: z.coerce.boolean().optional(),
  })
  .refine(
    (data) => data.salePriceCents === null || data.salePriceCents < data.priceCents,
    { message: "Sale price must be below the regular price.", path: ["salePriceCents"] },
  );

function parseNumeric(value: string | undefined): number | null {
  if (!value || !value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function readProductForm(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get("name") ?? "",
    slug: formData.get("slug") ?? "",
    subtitle: formData.get("subtitle") ?? "",
    description: formData.get("description") ?? "",
    story: formData.get("story") ?? "",
    priceCents: formData.get("price") ?? "",
    salePriceCents: formData.get("salePrice") ?? "",
    categoryId: formData.get("categoryId") ?? "0",
    gender: formData.get("gender") ?? "unisex",
    status: formData.get("status") ?? "draft",
    sku: formData.get("sku") ?? "",
    technologies: formData.get("technologies") ?? "",
    weightGrams: formData.get("weightGrams") ?? "",
    dropMm: formData.get("dropMm") ?? "",
    lowStockThreshold: formData.get("lowStockThreshold") ?? "",
    seoTitle: formData.get("seoTitle") ?? "",
    seoDescription: formData.get("seoDescription") ?? "",
    isNew: formData.get("isNew") === "on",
    isBestSeller: formData.get("isBestSeller") === "on",
  });
}

/* ------------------------------------------------------------------ */
/* Create / update                                                     */
/* ------------------------------------------------------------------ */

export async function createProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminAction();
  const parsed = readProductForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const data = parsed.data;
  const slug = uniqueSlug(data.slug || data.name, await getTakenProductSlugs());

  const [created] = await db
    .insert(products)
    .values({
      slug,
      name: data.name,
      subtitle: data.subtitle,
      description: data.description,
      story: data.story || null,
      priceCents: data.priceCents,
      salePriceCents: data.salePriceCents,
      categoryId: data.categoryId,
      gender: data.gender,
      status: data.status,
      sku: data.sku || null,
      technologies: data.technologies
        ? data.technologies.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
      weightGrams: parseNumeric(data.weightGrams),
      dropMm: parseNumeric(data.dropMm),
      lowStockThreshold: parseNumeric(data.lowStockThreshold),
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      isNew: Boolean(data.isNew),
      isBestSeller: Boolean(data.isBestSeller),
      publishedAt: data.status === "published" ? new Date() : null,
      updatedAt: new Date(),
    })
    .returning();

  // A product with no colourway can't render on the storefront, so every new
  // product starts with one default colourway and a full size run at zero stock.
  const [color] = await db
    .insert(productColors)
    .values({
      productId: created.id,
      name: "Default",
      slug: "default",
      hex: "#111111",
      isDefault: true,
      sortOrder: 0,
    })
    .returning();

  await db
    .insert(productSizes)
    .values(SIZE_RUN.map((size) => ({ colorId: color.id, size, stock: 0 })));

  await logActivity(admin, "created", "product", `Created product “${data.name}”`, created.id);
  revalidateProduct(slug);

  return { ok: true, message: "Product created.", id: created.id };
}

export async function updateProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminAction();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { ok: false, message: "Unknown product." };

  const parsed = readProductForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const existing = await db.query.products.findFirst({ where: eq(products.id, id) });
  if (!existing) return { ok: false, message: "That product no longer exists." };

  const data = parsed.data;

  // Only re-check uniqueness when the slug actually changed, so saving an
  // unchanged form never renames the product to "-2".
  let slug = existing.slug;
  const requested = slugify(data.slug || data.name);
  if (requested && requested !== existing.slug) {
    const taken = (await getTakenProductSlugs()).filter((s) => s !== existing.slug);
    slug = uniqueSlug(requested, taken);
  }

  await db
    .update(products)
    .set({
      slug,
      name: data.name,
      subtitle: data.subtitle,
      description: data.description,
      story: data.story || null,
      priceCents: data.priceCents,
      salePriceCents: data.salePriceCents,
      categoryId: data.categoryId,
      gender: data.gender,
      status: data.status,
      sku: data.sku || null,
      technologies: data.technologies
        ? data.technologies.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
      weightGrams: parseNumeric(data.weightGrams),
      dropMm: parseNumeric(data.dropMm),
      lowStockThreshold: parseNumeric(data.lowStockThreshold),
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      isNew: Boolean(data.isNew),
      isBestSeller: Boolean(data.isBestSeller),
      // Stamp publishedAt the first time it goes live, then leave it alone.
      publishedAt:
        data.status === "published" ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
      archivedAt: data.status === "archived" ? (existing.archivedAt ?? new Date()) : null,
      updatedAt: new Date(),
    })
    .where(eq(products.id, id));

  await logActivity(admin, "updated", "product", `Updated product “${data.name}”`, id);
  revalidateProduct(slug);
  if (slug !== existing.slug) revalidateProduct(existing.slug);

  return { ok: true, message: "Changes saved.", id };
}

/* ------------------------------------------------------------------ */
/* Lifecycle                                                           */
/* ------------------------------------------------------------------ */

export async function setProductStatusAction(id: number, status: ContentStatus) {
  const admin = await requireAdminAction();

  const existing = await db.query.products.findFirst({ where: eq(products.id, id) });
  if (!existing) return { ok: false, message: "That product no longer exists." };

  await db
    .update(products)
    .set({
      status,
      publishedAt: status === "published" ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
      archivedAt: status === "archived" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(products.id, id));

  const verb =
    status === "published" ? "published" : status === "archived" ? "archived" : "unpublished";
  await logActivity(admin, verb, "product", `${verb} “${existing.name}”`, id);
  revalidateProduct(existing.slug);

  return { ok: true, message: `Product ${verb}.` };
}

export async function duplicateProductAction(id: number) {
  const admin = await requireAdminAction();

  const source = await db.query.products.findFirst({ where: eq(products.id, id) });
  if (!source) return { ok: false, message: "That product no longer exists." };

  const slug = uniqueSlug(`${source.slug}-copy`, await getTakenProductSlugs());

  // The copy always lands as a draft: duplicating shouldn't put an unreviewed
  // product straight onto the storefront.
  const [copy] = await db
    .insert(products)
    .values({
      slug,
      name: `${source.name} (Copy)`,
      subtitle: source.subtitle,
      description: source.description,
      story: source.story,
      priceCents: source.priceCents,
      salePriceCents: source.salePriceCents,
      categoryId: source.categoryId,
      gender: source.gender,
      status: "draft",
      sku: source.sku ? `${source.sku}-COPY` : null,
      technologies: source.technologies,
      weightGrams: source.weightGrams,
      dropMm: source.dropMm,
      lowStockThreshold: source.lowStockThreshold,
      seoTitle: source.seoTitle,
      seoDescription: source.seoDescription,
      isNew: source.isNew,
      isBestSeller: false,
      publishedAt: null,
      updatedAt: new Date(),
    })
    .returning();

  // Deep-copy the variant tree: colourways, their images, and their size rows.
  const colors = await db.select().from(productColors).where(eq(productColors.productId, id));

  for (const color of colors) {
    const [newColor] = await db
      .insert(productColors)
      .values({
        productId: copy.id,
        name: color.name,
        slug: color.slug,
        hex: color.hex,
        isDefault: color.isDefault,
        sortOrder: color.sortOrder,
      })
      .returning();

    const [images, sizes] = await Promise.all([
      db.select().from(productImages).where(eq(productImages.colorId, color.id)),
      db.select().from(productSizes).where(eq(productSizes.colorId, color.id)),
    ]);

    if (images.length) {
      await db.insert(productImages).values(
        images.map((img) => ({
          colorId: newColor.id,
          url: img.url,
          alt: img.alt,
          sortOrder: img.sortOrder,
        })),
      );
    }
    if (sizes.length) {
      await db.insert(productSizes).values(
        sizes.map((s) => ({ colorId: newColor.id, size: s.size, stock: s.stock })),
      );
    }
  }

  await logActivity(admin, "duplicated", "product", `Duplicated “${source.name}”`, copy.id);
  revalidateProduct();

  return { ok: true, message: "Product duplicated as a draft.", id: copy.id };
}

export async function deleteProductAction(id: number) {
  const admin = await requireAdminAction();

  const existing = await db.query.products.findFirst({ where: eq(products.id, id) });
  if (!existing) return { ok: false, message: "That product no longer exists." };

  // order_items.product_id is ON DELETE SET NULL and every line keeps its own
  // name/price snapshot, so deleting a product never corrupts order history.
  await db.delete(products).where(eq(products.id, id));

  await logActivity(admin, "deleted", "product", `Deleted product “${existing.name}”`, id);
  revalidateProduct(existing.slug);

  return { ok: true, message: "Product deleted." };
}

export async function bulkProductAction(
  ids: number[],
  action: "publish" | "unpublish" | "archive" | "delete",
) {
  const admin = await requireAdminAction();
  if (!ids.length) return { ok: false, message: "Nothing selected." };

  if (action === "delete") {
    await db.delete(products).where(sql`${products.id} = any(${ids})`);
    await logActivity(admin, "deleted", "product", `Deleted ${ids.length} products`);
  } else {
    const status: ContentStatus =
      action === "publish" ? "published" : action === "archive" ? "archived" : "draft";

    await db
      .update(products)
      .set({
        status,
        publishedAt: status === "published" ? sql`coalesce(${products.publishedAt}, now())` : products.publishedAt,
        archivedAt: status === "archived" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(sql`${products.id} = any(${ids})`);

    const verb = status === "published" ? "published" : status === "archived" ? "archived" : "unpublished";
    await logActivity(admin, verb, "product", `${verb} ${ids.length} products`);
  }

  revalidateProduct();
  return { ok: true, message: `${ids.length} product${ids.length === 1 ? "" : "s"} updated.` };
}

/* ------------------------------------------------------------------ */
/* Variants — colourways                                               */
/* ------------------------------------------------------------------ */

const colorSchema = z.object({
  productId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1, "Name the colourway.").max(60),
  hex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex value like #1A1A1A"),
});

export async function addColorAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminAction();

  const parsed = colorSchema.safeParse({
    productId: formData.get("productId"),
    name: formData.get("name"),
    hex: formData.get("hex"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the colourway.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const { productId, name, hex } = parsed.data;
  const siblings = await db
    .select()
    .from(productColors)
    .where(eq(productColors.productId, productId));

  const [color] = await db
    .insert(productColors)
    .values({
      productId,
      name,
      slug: uniqueSlug(name, siblings.map((c) => c.slug)),
      hex,
      // The first colourway added to a product becomes its default.
      isDefault: siblings.length === 0,
      sortOrder: siblings.length,
    })
    .returning();

  await db
    .insert(productSizes)
    .values(SIZE_RUN.map((size) => ({ colorId: color.id, size, stock: 0 })));

  await logActivity(admin, "updated", "product", `Added colourway “${name}”`, productId);
  revalidateProduct();

  return { ok: true, message: "Colourway added.", id: color.id };
}

export async function updateColorAction(
  colorId: number,
  values: { name: string; hex: string },
) {
  await requireAdminAction();

  if (!/^#[0-9a-fA-F]{6}$/.test(values.hex)) {
    return { ok: false, message: "Use a hex value like #1A1A1A." };
  }
  if (!values.name.trim()) return { ok: false, message: "Name the colourway." };

  await db
    .update(productColors)
    .set({ name: values.name.trim(), hex: values.hex })
    .where(eq(productColors.id, colorId));

  revalidateProduct();
  return { ok: true, message: "Colourway updated." };
}

export async function deleteColorAction(colorId: number) {
  await requireAdminAction();

  const color = await db.query.productColors.findFirst({
    where: eq(productColors.id, colorId),
  });
  if (!color) return { ok: false, message: "That colourway no longer exists." };

  const siblings = await db
    .select()
    .from(productColors)
    .where(eq(productColors.productId, color.productId));

  // A product with no colourway can't render, so refuse to remove the last one.
  if (siblings.length <= 1) {
    return { ok: false, message: "A product needs at least one colourway." };
  }

  await db.delete(productColors).where(eq(productColors.id, colorId));

  // Promote another colourway if the default was the one removed.
  if (color.isDefault) {
    const next = siblings.find((c) => c.id !== colorId);
    if (next) {
      await db
        .update(productColors)
        .set({ isDefault: true })
        .where(eq(productColors.id, next.id));
    }
  }

  revalidateProduct();
  return { ok: true, message: "Colourway removed." };
}

export async function setDefaultColorAction(colorId: number, productId: number) {
  await requireAdminAction();

  // Exactly one default per product — clear the rest in the same breath.
  await db
    .update(productColors)
    .set({ isDefault: false })
    .where(eq(productColors.productId, productId));
  await db
    .update(productColors)
    .set({ isDefault: true })
    .where(eq(productColors.id, colorId));

  revalidateProduct();
  return { ok: true, message: "Default colourway set." };
}

/* ------------------------------------------------------------------ */
/* Variants — sizes & stock                                            */
/* ------------------------------------------------------------------ */

export async function updateStockAction(sizeId: number, stock: number) {
  await requireAdminAction();

  const value = Math.max(0, Math.round(Number(stock) || 0));
  await db.update(productSizes).set({ stock: value }).where(eq(productSizes.id, sizeId));

  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
  return { ok: true, message: "Stock updated." };
}

/** Applies one stock value to every size of a colourway. */
export async function bulkStockAction(colorId: number, stock: number) {
  await requireAdminAction();

  const value = Math.max(0, Math.round(Number(stock) || 0));
  await db.update(productSizes).set({ stock: value }).where(eq(productSizes.colorId, colorId));

  revalidateProduct();
  return { ok: true, message: "Stock updated across the size run." };
}

export async function addSizeAction(colorId: number, size: number) {
  await requireAdminAction();

  if (!Number.isFinite(size) || size <= 0) return { ok: false, message: "Enter a valid size." };

  const existing = await db
    .select()
    .from(productSizes)
    .where(and(eq(productSizes.colorId, colorId), eq(productSizes.size, size)));
  if (existing.length) return { ok: false, message: "That size already exists." };

  await db.insert(productSizes).values({ colorId, size, stock: 0 });
  revalidateProduct();
  return { ok: true, message: "Size added." };
}

export async function deleteSizeAction(sizeId: number) {
  await requireAdminAction();
  await db.delete(productSizes).where(eq(productSizes.id, sizeId));
  revalidateProduct();
  return { ok: true, message: "Size removed." };
}

/* ------------------------------------------------------------------ */
/* Images                                                              */
/* ------------------------------------------------------------------ */

const imageSchema = z.object({
  colorId: z.coerce.number().int().positive(),
  url: z
    .string()
    .trim()
    .min(1, "Add an image URL.")
    .refine(
      (v) => v.startsWith("/") || /^https?:\/\//i.test(v),
      "Use a path like /products/shoe.jpg or a full https:// URL.",
    ),
  alt: z.string().trim().min(2, "Describe the image for screen readers.").max(160),
});

export async function addImageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminAction();

  const parsed = imageSchema.safeParse({
    colorId: formData.get("colorId"),
    url: formData.get("url"),
    alt: formData.get("alt"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the image.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const siblings = await db
    .select()
    .from(productImages)
    .where(eq(productImages.colorId, parsed.data.colorId));

  await db.insert(productImages).values({
    colorId: parsed.data.colorId,
    url: parsed.data.url,
    alt: parsed.data.alt,
    sortOrder: siblings.length,
  });

  revalidateProduct();
  return { ok: true, message: "Image added." };
}

export async function deleteImageAction(imageId: number) {
  await requireAdminAction();
  await db.delete(productImages).where(eq(productImages.id, imageId));
  revalidateProduct();
  return { ok: true, message: "Image removed." };
}

/** Moves an image one slot earlier or later; sortOrder 0 is the card image. */
export async function reorderImageAction(imageId: number, direction: "up" | "down") {
  await requireAdminAction();

  const image = await db.query.productImages.findFirst({
    where: eq(productImages.id, imageId),
  });
  if (!image) return { ok: false, message: "That image no longer exists." };

  const siblings = await db
    .select()
    .from(productImages)
    .where(eq(productImages.colorId, image.colorId))
    .orderBy(productImages.sortOrder);

  const index = siblings.findIndex((s) => s.id === imageId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= siblings.length) return { ok: true, message: "" };

  // Swap the two rows' positions, then renumber so the sequence stays 0..n-1
  // even if earlier deletions left gaps.
  const reordered = [...siblings];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

  await Promise.all(
    reordered.map((img, i) =>
      db.update(productImages).set({ sortOrder: i }).where(eq(productImages.id, img.id)),
    ),
  );

  revalidateProduct();
  return { ok: true, message: "Image order updated." };
}
