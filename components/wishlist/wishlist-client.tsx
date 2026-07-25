"use client";

import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Heart, X } from "lucide-react";

import { formatPrice } from "@/lib/format";
import { useWishlist } from "@/lib/stores/wishlist";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { SplitWords } from "@/components/motion/reveal";

const EASE = [0.16, 1, 0.3, 1] as const;

export function WishlistClient() {
  const hydrated = useHydrated();
  const items = useWishlist((s) => s.items);
  const remove = useWishlist((s) => s.remove);
  const clear = useWishlist((s) => s.clear);

  return (
    <div className="container-page pb-24 pt-24 md:pt-32">
      <header className="flex flex-wrap items-end justify-between gap-4 pb-12">
        <div>
          <p className="text-eyebrow text-brand">Saved</p>
          <h1 className="mt-4 text-display-lg">
            <SplitWords text="Wishlist" />
          </h1>
          {hydrated && items.length > 0 && (
            <p className="mt-4 text-muted-foreground">
              {items.length} {items.length === 1 ? "item" : "items"} saved
            </p>
          )}
        </div>

        {hydrated && items.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Clear wishlist
          </button>
        )}
      </header>

      {/* The list lives in localStorage, so render skeletons until mounted. */}
      {!hydrated ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:gap-x-5 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-[4/5] w-full rounded-lg" />
              <Skeleton className="mt-4 h-4 w-3/4" />
              <Skeleton className="mt-2 h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Heart className="size-8 text-muted-foreground" strokeWidth={1.2} />
          <h2 className="mt-6 text-display-md">Nothing saved yet</h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            Tap the heart on any product to keep it here. Your wishlist stays on this
            device.
          </p>
          <ButtonLink className="mt-8 h-12 rounded-full px-8" href="/shop">
            Browse the range
          </ButtonLink>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:gap-x-5 md:gap-y-14 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.article
                key={item.productId}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="group relative"
              >
                <Link href={`/product/${item.slug}`} className="block">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-surface">
                    {item.image && (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="(min-width: 1280px) 22vw, 47vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      />
                    )}
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => remove(item.productId)}
                  aria-label={`Remove ${item.name} from wishlist`}
                  className="absolute right-2.5 top-2.5 grid size-10 place-items-center rounded-full bg-background/80 backdrop-blur transition-colors hover:bg-background"
                >
                  <X className="size-4" />
                </button>

                <div className="pt-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/product/${item.slug}`} className="min-w-0">
                      <h2 className="truncate font-display text-[15px] font-bold tracking-tight">
                        {item.name}
                      </h2>
                    </Link>
                    <p className="shrink-0 text-sm font-medium tabular-nums">
                      {formatPrice(item.salePriceCents ?? item.priceCents)}
                    </p>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {item.colorName}
                  </p>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
