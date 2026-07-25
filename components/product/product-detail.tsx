"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Check, Heart, Truck, RotateCcw, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { formatPrice, formatSize, discountPercent } from "@/lib/format";
import { useCart } from "@/lib/stores/cart";
import { useWishlist } from "@/lib/stores/wishlist";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { breadcrumbsFor } from "@/lib/taxonomy";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ProductGallery } from "./product-gallery";
import { RatingStars } from "./rating-stars";
import type { ProductDetail as ProductDetailType } from "@/lib/types";

const EASE = [0.16, 1, 0.3, 1] as const;

export function ProductDetail({ product }: { product: ProductDetailType }) {
  const [colorSlug, setColorSlug] = useState(
    (product.colors.find((c) => c.isDefault) ?? product.colors[0])?.slug,
  );
  const [size, setSize] = useState<number | null>(null);
  const [sizeError, setSizeError] = useState(false);

  const hydrated = useHydrated();
  const addToCart = useCart((s) => s.add);
  const toggleWishlist = useWishlist((s) => s.toggle);
  const wishlisted = useWishlist(
    (s) => hydrated && s.items.some((i) => i.productId === product.id),
  );

  const color = product.colors.find((c) => c.slug === colorSlug) ?? product.colors[0];
  const price = product.salePriceCents ?? product.priceCents;
  const onSale = product.salePriceCents !== null;
  const crumbs = breadcrumbsFor(product.categoryPath);

  const selected = color?.sizes.find((s) => s.size === size);
  const lowStock = selected && selected.stock > 0 && selected.stock <= 4;

  function handleAdd() {
    if (size === null) {
      setSizeError(true);
      // Nudge the size grid into view on mobile, where it may be off-screen.
      document.getElementById("size-grid")?.scrollIntoView({ block: "center" });
      return;
    }
    if (!color) return;

    addToCart({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      colorSlug: color.slug,
      colorName: color.name,
      size,
      quantity: 1,
      unitPriceCents: price,
      image: color.images[0]?.url ?? "",
    });
    toast.success(`${product.name} added to cart`);
  }

  return (
    <div className="container-page pb-20 pt-24 md:pt-32">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-6 hidden lg:block">
        <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {crumbs.map((crumb) => (
            <li key={crumb.href} className="flex items-center gap-1.5">
              <Link href={crumb.href} className="transition-colors hover:text-foreground">
                {crumb.name}
              </Link>
              <ChevronRight className="size-3" />
            </li>
          ))}
          <li className="text-foreground">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-16">
        {/* Gallery — sticky so the buy panel can scroll past it on desktop.
            `min-w-0` is load-bearing: a grid item defaults to `min-width:auto`,
            so the gallery's horizontal scroll rail forced the single mobile
            column out to the width of two slides and burst the viewport. */}
        <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
          <ProductGallery images={color?.images ?? []} productName={product.name} />
        </div>

        {/* Buy panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="min-w-0 lg:py-2"
        >
          <p className="text-eyebrow text-muted-foreground">{product.categoryName}</p>

          <h1 className="mt-3 font-display text-3xl font-bold leading-[1.05] tracking-[-0.03em] md:text-4xl">
            {product.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{product.subtitle}</p>

          {product.reviewCount > 0 && (
            <a href="#reviews" className="mt-4 inline-flex items-center gap-2">
              <RatingStars rating={product.rating} size={15} />
              <span className="text-sm text-muted-foreground underline underline-offset-4">
                {product.rating.toFixed(1)} · {product.reviewCount} reviews
              </span>
            </a>
          )}

          <div className="mt-6 flex items-baseline gap-3">
            <span
              className={cn(
                "font-display text-2xl font-bold tabular-nums",
                onSale && "text-brand",
              )}
            >
              {formatPrice(price)}
            </span>
            {onSale && (
              <>
                <span className="text-base text-muted-foreground line-through tabular-nums">
                  {formatPrice(product.priceCents)}
                </span>
                <span className="rounded-full bg-brand-muted px-2 py-0.5 text-xs font-semibold text-brand">
                  Save {discountPercent(product.priceCents, product.salePriceCents!)}%
                </span>
              </>
            )}
          </div>

          {/* Colours */}
          <div className="mt-8">
            <div className="flex items-baseline justify-between">
              <p className="text-eyebrow text-muted-foreground">Colour</p>
              <p className="text-xs text-muted-foreground">{color?.name}</p>
            </div>
            <div className="mt-3.5 flex flex-wrap gap-2.5">
              {product.colors.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => {
                    setColorSlug(c.slug);
                    setSize(null);
                  }}
                  aria-label={c.name}
                  aria-pressed={c.slug === color?.slug}
                  className={cn(
                    "size-10 rounded-full border transition-transform hover:scale-105",
                    c.slug === color?.slug
                      ? "border-transparent ring-1 ring-foreground ring-offset-2 ring-offset-background"
                      : "border-black/15",
                  )}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          {/* Sizes */}
          <div id="size-grid" className="mt-8 scroll-mt-28">
            <div className="flex items-baseline justify-between">
              <p className="text-eyebrow text-muted-foreground">Size (US)</p>
              <a href="#sizing" className="text-xs text-muted-foreground underline underline-offset-4">
                Size guide
              </a>
            </div>

            <div className="mt-3.5 grid grid-cols-4 gap-2 sm:grid-cols-5">
              {color?.sizes.map((s) => {
                const out = s.stock === 0;
                const active = size === s.size;
                return (
                  <button
                    key={s.size}
                    type="button"
                    disabled={out}
                    aria-pressed={active}
                    onClick={() => {
                      setSize(s.size);
                      setSizeError(false);
                    }}
                    className={cn(
                      "min-h-12 rounded-md border text-sm font-medium transition-colors",
                      out
                        ? "cursor-not-allowed border-border/60 text-muted-foreground/40 line-through"
                        : active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border hover:border-foreground",
                    )}
                  >
                    {formatSize(s.size)}
                  </button>
                );
              })}
            </div>

            {sizeError && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 text-sm text-destructive"
              >
                Please select a size.
              </motion.p>
            )}
            {lowStock && (
              <p className="mt-3 text-sm text-brand">
                Only {selected!.stock} left in this size.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col gap-2.5">
            <Button onClick={handleAdd} className="h-14 rounded-full text-sm font-semibold">
              Add to cart
            </Button>
            <Button
              variant="outline"
              className="h-14 gap-2 rounded-full text-sm font-semibold"
              onClick={() =>
                toggleWishlist({
                  productId: product.id,
                  slug: product.slug,
                  name: product.name,
                  subtitle: product.subtitle,
                  priceCents: product.priceCents,
                  salePriceCents: product.salePriceCents,
                  image: color?.images[0]?.url ?? "",
                  colorName: color?.name ?? "",
                })
              }
            >
              {wishlisted ? "Saved to wishlist" : "Add to wishlist"}
              <Heart
                className={cn("size-4", wishlisted && "fill-brand text-brand")}
                strokeWidth={1.8}
              />
            </Button>
          </div>

          {/* Reassurance */}
          <div className="mt-7 space-y-3 border-t border-border pt-7">
            {[
              { icon: Truck, text: "Free delivery on orders over $150" },
              { icon: RotateCcw, text: "60-day returns, worn or unworn" },
              { icon: Check, text: "Two-year construction warranty" },
            ].map((item) => (
              <p key={item.text} className="flex items-center gap-3 text-sm text-muted-foreground">
                <item.icon className="size-4 shrink-0" strokeWidth={1.6} />
                {item.text}
              </p>
            ))}
          </div>

          {/* Details */}
          {/* Base UI: multiple={false} is the equivalent of Radix's
              type="single" collapsible. */}
          <Accordion multiple={false} className="mt-8 border-t border-border">
            <AccordionItem value="description">
              <AccordionTrigger className="text-sm font-semibold">
                Description
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {product.description}
                {product.story && (
                  <span className="mt-4 block border-l-2 border-brand pl-4 italic">
                    {product.story}
                  </span>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tech">
              <AccordionTrigger className="text-sm font-semibold">
                Technology & specification
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2">
                  {product.technologies.map((tech) => (
                    <li key={tech} className="flex items-center gap-2.5 text-sm">
                      <span className="size-1 rounded-full bg-brand" />
                      {tech}
                    </li>
                  ))}
                </ul>
                <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-5 text-sm">
                  {product.weightGrams && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Weight</dt>
                      <dd className="mt-0.5 font-medium tabular-nums">
                        {product.weightGrams} g
                      </dd>
                    </div>
                  )}
                  {product.dropMm !== null && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Heel-toe drop</dt>
                      <dd className="mt-0.5 font-medium tabular-nums">{product.dropMm} mm</dd>
                    </div>
                  )}
                </dl>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="shipping" id="sizing">
              <AccordionTrigger className="text-sm font-semibold">
                Shipping & returns
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                <p>
                  Standard delivery is $9.95 and arrives in 3–5 working days. Orders over
                  $150 ship free. Express delivery is available at checkout for next
                  working day before 1pm.
                </p>
                <p>
                  Return anything within 60 days, worn or unworn, for a full refund. If
                  you have run in them and they are not right, we still want them back —
                  that is how the next version gets better.
                </p>
                <p>
                  <strong className="text-foreground">Sizing:</strong> this model fits true
                  to size. If you are between sizes, take the half size up — feet swell
                  over distance.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </motion.div>
      </div>
    </div>
  );
}
