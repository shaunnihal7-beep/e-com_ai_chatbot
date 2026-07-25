"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine } from "@/lib/types";

/** A line is unique per product + colourway + size. */
const lineKey = (l: Pick<CartLine, "productId" | "colorSlug" | "size">) =>
  `${l.productId}:${l.colorSlug}:${l.size}`;

type CartState = {
  lines: CartLine[];
  isOpen: boolean;
  /** Bumped on every add so the header badge can animate. */
  lastAddedAt: number | null;

  add: (line: CartLine) => void;
  remove: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  setOpen: (open: boolean) => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      isOpen: false,
      lastAddedAt: null,

      add: (line) =>
        set((state) => {
          const key = lineKey(line);
          const existing = state.lines.find((l) => lineKey(l) === key);
          const lines = existing
            ? state.lines.map((l) =>
                lineKey(l) === key ? { ...l, quantity: l.quantity + line.quantity } : l,
              )
            : [...state.lines, line];
          return { lines, isOpen: true, lastAddedAt: Date.now() };
        }),

      remove: (key) =>
        set((state) => ({ lines: state.lines.filter((l) => lineKey(l) !== key) })),

      setQuantity: (key, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => lineKey(l) !== key)
              : state.lines.map((l) => (lineKey(l) === key ? { ...l, quantity } : l)),
        })),

      clear: () => set({ lines: [], isOpen: false }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      setOpen: (isOpen) => set({ isOpen }),
    }),
    {
      name: "veloce-cart",
      // The drawer should never be open on a fresh page load.
      partialize: (state) => ({ lines: state.lines }) as CartState,
    },
  ),
);

export { lineKey };

export const cartCount = (lines: CartLine[]) =>
  lines.reduce((sum, l) => sum + l.quantity, 0);

export const cartSubtotal = (lines: CartLine[]) =>
  lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);

/** Free delivery over $150 — mirrored in the checkout summary. */
export const FREE_SHIPPING_THRESHOLD = 15000;
export const STANDARD_SHIPPING = 995;

export const shippingFor = (subtotal: number) =>
  subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;

export const taxFor = (subtotal: number) => Math.round(subtotal * 0.08);
