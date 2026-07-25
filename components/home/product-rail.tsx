import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ProductCard } from "@/components/product/product-card";
import { Reveal } from "@/components/motion/reveal";
import type { ProductCard as ProductCardType } from "@/lib/types";

/**
 * Horizontally scrolling product row.
 *
 * Uses native scroll-snap rather than a JS carousel — it inherits the
 * platform's momentum, works with a trackpad, and costs no runtime.
 */
export function ProductRail({
  eyebrow,
  title,
  description,
  href,
  hrefLabel,
  products,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  href: string;
  hrefLabel: string;
  products: ProductCardType[];
}) {
  if (products.length === 0) return null;

  return (
    <section className="section-y">
      <div className="container-page">
        <Reveal>
          <p className="text-eyebrow text-brand">{eyebrow}</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <h2 className="max-w-[16ch] text-display-lg">{title}</h2>
            <Link
              href={href}
              className="group inline-flex shrink-0 items-center gap-2 text-sm font-medium"
            >
              {hrefLabel}
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
          {description && (
            <p className="mt-5 max-w-lg text-body-lg text-muted-foreground">
              {description}
            </p>
          )}
        </Reveal>
      </div>

      {/* Bleeds to the viewport edge so the row reads as continuing off-screen. */}
      <div className="no-scrollbar mt-12 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 md:gap-5 md:px-10 xl:px-14">
        {products.map((product, i) => (
          <div
            key={product.id}
            className="w-[62vw] shrink-0 snap-start sm:w-[42vw] md:w-[38vw] lg:w-[26vw] xl:w-[21vw]"
          >
            <ProductCard product={product} index={i} />
          </div>
        ))}
        {/* Trailing spacer so the last card can snap clear of the edge. */}
        <div className="w-2 shrink-0 md:w-6" aria-hidden />
      </div>
    </section>
  );
}
