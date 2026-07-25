/**
 * URL-safe slug from arbitrary text. Used by every CMS form that writes a slug,
 * so the storefront never has to defend against a stray space or slash.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    // Strip combining marks so "Café" becomes "cafe", not "caf".
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Appends -2, -3, … until the slug is free. `taken` is the set of slugs already
 * in use, which the caller reads from the database.
 */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const root = slugify(base) || "untitled";
  if (!used.has(root)) return root;

  let n = 2;
  while (used.has(`${root}-${n}`)) n += 1;
  return `${root}-${n}`;
}

/**
 * Slugs that would shadow a real storefront route. The catch-all page route is
 * matched last by Next, but a page at /cart would still be unreachable, so the
 * CMS rejects these up front rather than letting someone create a dead page.
 */
export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "account",
  "cart",
  "checkout",
  "collections",
  "credits",
  "diagnostics",
  "order",
  "product",
  "search",
  "shop",
  "wishlist",
  "blog",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}
