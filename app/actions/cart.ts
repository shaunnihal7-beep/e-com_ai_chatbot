"use server";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { productColors, productSizes } from "@/db/schema";
import type { SizeOption } from "@/lib/types";

/**
 * Sizes for one colourway, fetched on demand when Quick Add opens.
 *
 * Deliberately not bundled into the listing query — shipping a full size run
 * for every card would multiply the grid payload for data most visitors
 * never open.
 */
export async function getSizesForColor(
  productId: number,
  colorSlug: string,
): Promise<SizeOption[]> {
  const color = await db.query.productColors.findFirst({
    where: and(eq(productColors.productId, productId), eq(productColors.slug, colorSlug)),
  });
  if (!color) return [];

  const rows = await db
    .select({ size: productSizes.size, stock: productSizes.stock })
    .from(productSizes)
    .where(eq(productSizes.colorId, color.id))
    .orderBy(asc(productSizes.size));

  return rows;
}
