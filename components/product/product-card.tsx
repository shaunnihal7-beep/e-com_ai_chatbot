"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Heart, Plus } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { formatPrice, formatSize, discountPercent } from "@/lib/format";
import { useCart } from "@/lib/stores/cart";
import { useWishlist } from "@/lib/stores/wishlist";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { getSizesForColor } from "@/app/actions/cart";
import { RatingStars } from "./rating-stars";
import type { ProductCard as ProductCardType, SizeOption } from "@/lib/types";

const EASE = [0.16, 1, 0.3, 1] as const;

export function ProductCard({
  product,
  priority = false,
  index = 0,
}: {
  product: ProductCardType;
  /** Set on the first row so the LCP image isn't lazy-loaded. */
  priority?: boolean;
  index?: number;
}) {
  const [activeColor, setActiveColor] = useState(
    product.colors.find((c) => c.isDefault) ?? product.colors[0],
  );
  const [hovered, setHovered] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);
  const [sizes, setSizes] = useState<SizeOption[]>([]);
  const [pending, startTransition] = useTransition();

  const hydrated = useHydrated();
  const addToCart = useCart((s) => s.add);
  const toggleWishlist = useWishlist((s) => s.toggle);
  const wishlisted = useWishlist(
    (s) => hydrated && s.items.some((i) => i.productId === product.id),
  );

  const price = product.salePriceCents ?? product.priceCents;
  const onSale = product.salePriceCents !== null;
  const primary = activeColor?.images[0];
  const secondary = activeColor?.images[1] ?? primary;

  function openQuickAdd(event: React.MouseEvent) {
    event.preventDefault();
    if (!activeColor) return;
    setQuickAdd(true);
    if (sizes.length === 0) {
      startTransition(async () => {
        setSizes(await getSizesForColor(product.id, activeColor.slug));
      });
    }
  }

  function add(size: number) {
    if (!activeColor || !primary) return;
    addToCart({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      colorSlug: activeColor.slug,
      colorName: activeColor.name,
      size,
      quantity: 1,
      unitPriceCents: price,
      image: primary.url,
    });
    setQuickAdd(false);
    toast.success(`${product.name} — UK ${formatSize(size)} added`);
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: Math.min(index, 7) * 0.05, ease: EASE }}
      className="group relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setQuickAdd(false);
      }}
    >
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-surface">
          {primary && (
            <Image
              src={primary.url}
              alt={primary.alt}
              fill
              priority={priority}
              sizes="(min-width: 1280px) 22vw, (min-width: 768px) 45vw, 47vw"
              className={cn(
                "object-cover transition-[transform,opacity] duration-700 ease-out",
                hovered && secondary !== primary ? "opacity-0" : "opacity-100",
                hovered && "scale-[1.04]",
              )}
            />
          )}

          {/* Hover image — only rendered once the card is hovered, so a full
              grid doesn't download two images per card up front. */}
          {secondary && secondary !== primary && hovered && (
            <Image
              src={secondary.url}
              alt={secondary.alt}
              fill
              sizes="(min-width: 1280px) 22vw, (min-width: 768px) 45vw, 47vw"
              className="scale-[1.04] object-cover transition-transform duration-700 ease-out"
            />
          )}

          {/* Badges */}
          <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {onSale && (
              <span className="rounded-full bg-brand px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-foreground">
                −{discountPercent(product.priceCents, product.salePriceCents!)}%
              </span>
            )}
            {product.isNew && !onSale && (
              <span className="rounded-full bg-foreground px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-background">
                New
              </span>
            )}
            {product.isBestSeller && !onSale && !product.isNew && (
              <span className="rounded-full bg-background/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur">
                Best Seller
              </span>
            )}
          </div>

          {/* Wishlist */}
          <button
            type="button"
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            onClick={(e) => {
              e.preventDefault();
              toggleWishlist({
                productId: product.id,
                slug: product.slug,
                name: product.name,
                subtitle: product.subtitle,
                priceCents: product.priceCents,
                salePriceCents: product.salePriceCents,
                image: primary?.url ?? "",
                colorName: activeColor?.name ?? "",
              });
            }}
            className="absolute right-1.5 top-1.5 grid size-11 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-background/70 hover:text-foreground"
          >
            <motion.span
              key={String(wishlisted)}
              initial={{ scale: 0.7 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 18 }}
            >
              <Heart
                className={cn("size-[18px]", wishlisted && "fill-brand text-brand")}
                strokeWidth={1.6}
              />
            </motion.span>
          </button>

          {/* Quick Add */}
          <div className="absolute inset-x-2.5 bottom-2.5">
            <AnimatePresence mode="wait">
              {quickAdd ? (
                <motion.div
                  key="sizes"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.28, ease: EASE }}
                  className="glass rounded-md p-2.5"
                  onClick={(e) => e.preventDefault()}
                >
                  <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {pending ? "Loading sizes…" : "Select a size"}
                  </p>
                  <div
                    data-lenis-prevent
                    className="flex max-h-28 flex-wrap gap-1 overflow-y-auto"
                  >
                    {sizes.map((s) => (
                      <button
                        key={s.size}
                        type="button"
                        disabled={s.stock === 0}
                        onClick={(e) => {
                          e.preventDefault();
                          add(s.size);
                        }}
                        className={cn(
                          // 40px square on touch: the previous 30px chips were
                          // well under a comfortable thumb target.
                          "min-h-10 min-w-10 rounded px-1.5 text-xs font-medium transition-colors",
                          s.stock === 0
                            ? "cursor-not-allowed text-muted-foreground/40 line-through"
                            : "hover:bg-foreground hover:text-background",
                        )}
                      >
                        {formatSize(s.size)}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                // Hidden until hover on fine pointers; always visible on touch,
                // where there is no hover to reveal it. Keyed off the device's
                // hover capability rather than a width breakpoint — a wide
                // touchscreen would otherwise get an affordance it can never
                // trigger. The !important beats Framer's inline style.
                <motion.button
                  key="trigger"
                  type="button"
                  onClick={openQuickAdd}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{
                    opacity: hovered ? 1 : 0,
                    y: hovered ? 0 : 10,
                  }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="glass flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md py-2.5 text-xs font-semibold uppercase tracking-wider max-lg:!translate-y-0 max-lg:!opacity-100 [@media(hover:none)]:!translate-y-0 [@media(hover:none)]:!opacity-100"
                >
                  <Plus className="size-3.5" strokeWidth={2.4} />
                  Quick Add
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Link>

      {/* Meta */}
      <div className="pt-3.5">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/product/${product.slug}`} className="min-w-0">
            <h3 className="truncate font-display text-[15px] font-bold tracking-tight">
              {product.name}
            </h3>
          </Link>
          <p className="shrink-0 text-sm font-medium tabular-nums">
            {onSale ? (
              <span className="flex items-baseline gap-1.5">
                <span className="text-brand">{formatPrice(price)}</span>
                <span className="text-xs text-muted-foreground line-through">
                  {formatPrice(product.priceCents)}
                </span>
              </span>
            ) : (
              formatPrice(price)
            )}
          </p>
        </div>

        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {product.categoryName}
        </p>

        {product.reviewCount > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            <RatingStars rating={product.rating} size={12} />
            <span className="text-[11px] text-muted-foreground">
              {product.rating.toFixed(1)} ({product.reviewCount})
            </span>
          </div>
        )}

        {/* Colour swatches. The swatch itself stays 16px, but the hit area is
            36px — a 16px tap target is unusable on a phone. */}
        {product.colors.length > 1 && (
          <div className="-ml-2.5 mt-1 flex items-center">
            {product.colors.map((color) => (
              <button
                key={color.slug}
                type="button"
                aria-label={color.name}
                title={color.name}
                aria-pressed={activeColor?.slug === color.slug}
                onClick={() => setActiveColor(color)}
                className="grid size-9 place-items-center"
              >
                <span
                  className={cn(
                    "size-4 rounded-full border transition-[box-shadow,transform] group-hover:scale-105",
                    activeColor?.slug === color.slug
                      ? "border-transparent ring-1 ring-foreground ring-offset-2 ring-offset-background"
                      : "border-black/15",
                  )}
                  style={{ backgroundColor: color.hex }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.article>
  );
}
