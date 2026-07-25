"use client";

import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";

import { formatPrice, formatSize } from "@/lib/format";
import {
  cartSubtotal,
  lineKey,
  shippingFor,
  taxFor,
  useCart,
  FREE_SHIPPING_THRESHOLD,
} from "@/lib/stores/cart";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { SplitWords } from "@/components/motion/reveal";

const EASE = [0.16, 1, 0.3, 1] as const;

export function CartClient() {
  const hydrated = useHydrated();
  const { lines, remove, setQuantity } = useCart();

  const subtotal = cartSubtotal(lines);
  const shipping = shippingFor(subtotal);
  const tax = taxFor(subtotal);
  const total = subtotal + shipping + tax;
  const remaining = FREE_SHIPPING_THRESHOLD - subtotal;

  if (!hydrated) {
    return (
      <div className="container-page pb-24 pt-24 md:pt-32">
        <Skeleton className="h-14 w-64" />
        <div className="mt-12 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="container-page flex min-h-[70dvh] flex-col items-center justify-center py-24 text-center">
        <ShoppingBag className="size-8 text-muted-foreground" strokeWidth={1.2} />
        <h1 className="mt-6 text-display-md">Your cart is empty</h1>
        <p className="mt-4 max-w-md text-muted-foreground">
          Nothing in here yet. Have a look at what just landed.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink className="h-12 rounded-full px-8" href="/shop">
            Shop the range
          </ButtonLink>
          <ButtonLink
            variant="outline"
            className="h-12 rounded-full px-8"
            href="/wishlist"
          >
            View wishlist
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page pb-24 pt-24 md:pt-32">
      <header className="pb-12">
        <p className="text-eyebrow text-brand">
          {lines.length} {lines.length === 1 ? "item" : "items"}
        </p>
        <h1 className="mt-4 text-display-lg">
          <SplitWords text="Cart" />
        </h1>
      </header>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-16">
        {/* Lines */}
        <div>
          <ul className="divide-y divide-border border-y border-border">
            <AnimatePresence initial={false}>
              {lines.map((line) => {
                const key = lineKey(line);
                return (
                  <motion.li
                    key={key}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <div className="flex gap-4 py-6 md:gap-6">
                      <Link
                        href={`/product/${line.slug}`}
                        className="relative size-28 shrink-0 overflow-hidden rounded-lg bg-surface md:size-36"
                      >
                        <Image
                          src={line.image}
                          alt={line.name}
                          fill
                          sizes="(min-width: 768px) 144px, 112px"
                          className="object-cover"
                        />
                      </Link>

                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <Link href={`/product/${line.slug}`} className="min-w-0">
                            <h2 className="truncate font-display text-base font-bold tracking-tight md:text-lg">
                              {line.name}
                            </h2>
                          </Link>
                          <button
                            type="button"
                            onClick={() => remove(key)}
                            aria-label={`Remove ${line.name}`}
                            className="-mr-1 -mt-1 p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <X className="size-4" />
                          </button>
                        </div>

                        <p className="mt-1 text-sm text-muted-foreground">
                          {line.colorName} · US {formatSize(line.size)}
                        </p>

                        <div className="mt-auto flex items-center justify-between pt-4">
                          <div className="flex items-center rounded-full border border-border">
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              onClick={() => setQuantity(key, line.quantity - 1)}
                              className="grid size-10 place-items-center rounded-full transition-colors hover:bg-muted"
                            >
                              <Minus className="size-3.5" />
                            </button>
                            <span className="w-8 text-center text-sm tabular-nums">
                              {line.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              onClick={() => setQuantity(key, line.quantity + 1)}
                              className="grid size-10 place-items-center rounded-full transition-colors hover:bg-muted"
                            >
                              <Plus className="size-3.5" />
                            </button>
                          </div>

                          <p className="font-medium tabular-nums">
                            {formatPrice(line.unitPriceCents * line.quantity)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>

          <Link
            href="/shop"
            className="mt-8 inline-block text-sm underline underline-offset-4"
          >
            Continue shopping
          </Link>
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-xl border border-border p-6">
            <h2 className="font-display text-lg font-bold tracking-tight">Summary</h2>

            <dl className="mt-5 space-y-2.5 text-sm">
              <div className="flex items-baseline justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-muted-foreground">Delivery</dt>
                <dd className="tabular-nums">
                  {shipping === 0 ? "Free" : formatPrice(shipping)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-muted-foreground">Estimated tax</dt>
                <dd className="tabular-nums">{formatPrice(tax)}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-border pt-3">
                <dt className="font-medium">Total</dt>
                <dd className="font-display text-xl font-bold tabular-nums">
                  {formatPrice(total)}
                </dd>
              </div>
            </dl>

            {remaining > 0 && (
              <p className="mt-5 rounded-lg bg-surface p-3 text-xs text-muted-foreground">
                Add {formatPrice(remaining)} more for free delivery.
              </p>
            )}

            <ButtonLink
              className="mt-6 h-13 w-full rounded-full text-sm font-semibold"
              href="/checkout"
            >
              Checkout
            </ButtonLink>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              60-day returns · Two-year warranty
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
