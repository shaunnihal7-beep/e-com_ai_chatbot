"use server";

import { searchProducts } from "@/lib/queries/products";
import type { ProductCard } from "@/lib/types";

/** Used by the header search overlay for as-you-type results. */
export async function searchAction(query: string): Promise<ProductCard[]> {
  if (query.trim().length < 2) return [];
  return searchProducts(query, 8);
}
