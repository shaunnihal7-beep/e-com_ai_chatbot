"use client";

import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ButtonLink } from "@/components/ui/button-link";
import { formatPrice, formatSize } from "@/lib/format";
import {
  cartSubtotal,
  lineKey,
  useCart,
  FREE_SHIPPING_THRESHOLD,
} from "@/lib/stores/cart";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { usePreserveScroll } from "@/lib/hooks/use-preserve-scroll";

const EASE = [0.16, 1, 0.3, 1] as const;

export function CartDrawer() {
  const { lines, isOpen, setOpen, remove, setQuantity } = useCart();
  const hydrated = useHydrated();

  usePreserveScroll(isOpen);

  const subtotal = cartSubtotal(lines);
  const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  if (!hydrated) return null;

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      {/* The width overrides carry the `data-[side=right]` prefix so they beat
          the primitive's own `w-3/4` — a plain `w-full` is a different
          tailwind-merge key and loses, which left the drawer at 75% of a
          phone screen and clipped the line prices. */}
      <SheetContent
        side="right"
        className="flex h-[100dvh] flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md"
      >
        <SheetHeader className="border-b px-5 py-5 pr-14">
          <SheetTitle className="font-display text-xl font-bold tracking-tight">
            Cart {lines.length > 0 && <span className="text-muted-foreground">({lines.length})</span>}
          </SheetTitle>
        </SheetHeader>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
            <ShoppingBag className="size-8 text-muted-foreground" strokeWidth={1.2} />
            <div>
              <p className="font-display text-lg font-semibold">Your cart is empty</p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Nothing in here yet. The good stuff is one tap away.
              </p>
            </div>
            <ButtonLink
              className="h-12 rounded-full px-8"
              onClick={() => setOpen(false)}
              href="/shop"
            >
              Start shopping
            </ButtonLink>
          </div>
        ) : (
          <>
            {/* Free-shipping progress */}
            <div className="border-b px-5 py-4">
              {remaining > 0 ? (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {formatPrice(remaining)}
                  </span>{" "}
                  away from free delivery
                </p>
              ) : (
                <p className="text-xs font-medium text-success">
                  Free delivery unlocked
                </p>
              )}
              <div className="mt-2.5 h-[3px] w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-brand"
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.6, ease: EASE }}
                />
              </div>
            </div>

            <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto px-5">
              <AnimatePresence initial={false}>
                {lines.map((line) => {
                  const key = lineKey(line);
                  return (
                    <motion.div
                      key={key}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.32, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <div className="flex gap-4 border-b py-5">
                        <Link
                          href={`/product/${line.slug}`}
                          onClick={() => setOpen(false)}
                          className="relative size-24 shrink-0 overflow-hidden rounded-md bg-surface"
                        >
                          <Image
                            src={line.image}
                            alt={line.name}
                            fill
                            sizes="96px"
                            className="object-cover"
                          />
                        </Link>

                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              href={`/product/${line.slug}`}
                              onClick={() => setOpen(false)}
                              className="min-w-0"
                            >
                              <p className="truncate font-display text-sm font-bold">
                                {line.name}
                              </p>
                            </Link>
                            <button
                              type="button"
                              onClick={() => remove(key)}
                              aria-label={`Remove ${line.name}`}
                              className="-mr-1 -mt-1 p-1 text-muted-foreground transition-colors hover:text-foreground"
                            >
                              <X className="size-4" />
                            </button>
                          </div>

                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {line.colorName} · US {formatSize(line.size)}
                          </p>

                          <div className="mt-auto flex items-center justify-between pt-3">
                            <div className="flex items-center rounded-full border border-border">
                              <button
                                type="button"
                                aria-label="Decrease quantity"
                                onClick={() => setQuantity(key, line.quantity - 1)}
                                className="grid size-9 place-items-center rounded-full transition-colors hover:bg-muted"
                              >
                                <Minus className="size-3.5" />
                              </button>
                              <span className="w-7 text-center text-sm tabular-nums">
                                {line.quantity}
                              </span>
                              <button
                                type="button"
                                aria-label="Increase quantity"
                                onClick={() => setQuantity(key, line.quantity + 1)}
                                className="grid size-9 place-items-center rounded-full transition-colors hover:bg-muted"
                              >
                                <Plus className="size-3.5" />
                              </button>
                            </div>

                            <p className="text-sm font-medium tabular-nums">
                              {formatPrice(line.unitPriceCents * line.quantity)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            <div className="border-t px-5 pt-5 pb-safe">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <motion.span
                  key={subtotal}
                  initial={{ opacity: 0.5, y: -3 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="font-display text-xl font-bold tabular-nums"
                >
                  {formatPrice(subtotal)}
                </motion.span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Taxes and delivery calculated at checkout.
              </p>

              <div className="mt-5 flex flex-col gap-2.5">
                <ButtonLink
                  className="h-12 rounded-full text-sm"
                  href="/checkout"
                  onClick={() => setOpen(false)}
                >
                  Checkout
                </ButtonLink>
                <ButtonLink
                  variant="outline"
                  className="h-12 rounded-full text-sm"
                  href="/cart"
                  onClick={() => setOpen(false)}
                >
                  View cart
                </ButtonLink>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
