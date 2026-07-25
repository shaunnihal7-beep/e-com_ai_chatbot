import "server-only";
import { cache } from "react";

import { flattenTaxonomy } from "@/lib/taxonomy";
import { getProducts } from "./products";

export type CategoryPreview = {
  path: string;
  name: string;
  image: string;
  productName: string;
  count: number;
};

/**
 * One image per category for the mega-menu and the featured-category grid.
 *
 * `cache` dedupes this across the header, footer and any page that needs it
 * within a single render pass.
 */
export const getCategoryPreviews = cache(async (): Promise<Record<string, CategoryPreview>> => {
  const all = await getProducts();
  const out: Record<string, CategoryPreview> = {};

  for (const node of flattenTaxonomy()) {
    const inCategory = all.filter(
      (p) => p.categoryPath === node.path || p.categoryPath.startsWith(`${node.path}/`),
    );
    if (inCategory.length === 0) continue;

    // Prefer a best seller — it is the most photogenic bet available.
    const hero = inCategory.find((p) => p.isBestSeller) ?? inCategory[0];
    const color = hero.colors.find((c) => c.isDefault) ?? hero.colors[0];

    out[node.path] = {
      path: node.path,
      name: node.name,
      image: color?.images[0]?.url ?? "",
      productName: hero.name,
      count: inCategory.length,
    };
  }

  return out;
});
