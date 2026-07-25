"use client";

import { useEffect, useState } from "react";

/**
 * True only after the client has mounted.
 *
 * Cart and wishlist state live in localStorage, so anything derived from them
 * differs between server and client HTML. Gating on this avoids hydration
 * mismatches without disabling SSR for the whole subtree.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
