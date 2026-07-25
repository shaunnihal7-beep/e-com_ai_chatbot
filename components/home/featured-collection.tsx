"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

import { formatPrice } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button-link";
import { Magnetic } from "@/components/motion/magnetic";
import type { CollectionView } from "@/lib/queries/collections";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Editorial spread for one curated collection: a stacked image cluster on the
 * left, the collection story and a compact product list on the right.
 */
export function FeaturedCollection({ collection }: { collection: CollectionView }) {
  const [first, second, third] = collection.products;
  const heroImage = first?.colors[0]?.images[0];
  const secondImage = second?.colors[0]?.images[0];

  return (
    <section className="container-page section-y">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        {/* Image cluster */}
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, ease: EASE }}
            className="relative aspect-[4/5] w-[82%] overflow-hidden rounded-xl bg-surface"
          >
            {heroImage && (
              <Image
                src={heroImage.url}
                alt={heroImage.alt}
                fill
                sizes="(min-width: 1024px) 40vw, 82vw"
                className="object-cover"
              />
            )}
          </motion.div>

          {/* Overlapping second plate — builds depth without a shadow. */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
            className="absolute -bottom-10 right-0 aspect-[4/5] w-[46%] overflow-hidden rounded-xl bg-surface ring-8 ring-background"
          >
            {secondImage && (
              <Image
                src={secondImage.url}
                alt={secondImage.alt}
                fill
                sizes="(min-width: 1024px) 22vw, 46vw"
                className="object-cover"
              />
            )}
          </motion.div>
        </div>

        {/* Copy */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, delay: 0.1, ease: EASE }}
          className="mt-16 lg:mt-0"
        >
          <p className="text-eyebrow text-brand">Featured collection</p>
          <h2 className="mt-4 text-display-lg">{collection.name}</h2>
          <p className="mt-3 font-display text-xl text-muted-foreground">
            {collection.tagline}
          </p>
          <p className="mt-6 max-w-md text-body-lg text-muted-foreground">
            {collection.description}
          </p>

          {/* Compact product list */}
          <ul className="mt-9 divide-y divide-border border-y border-border">
            {[first, second, third].filter(Boolean).map((product) => (
              <li key={product!.id}>
                <Link
                  href={`/product/${product!.slug}`}
                  className="group flex items-center justify-between gap-4 py-3.5"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-display text-sm font-bold">
                      {product!.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {product!.categoryName}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3 text-sm tabular-nums">
                    {formatPrice(product!.salePriceCents ?? product!.priceCents)}
                    <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <Magnetic className="mt-9">
            <ButtonLink
              className="h-14 rounded-full px-9 text-sm font-semibold"
              href={`/collections/${collection.slug}`}
            >
              Explore {collection.name}
            </ButtonLink>
          </Magnetic>
        </motion.div>
      </div>
    </section>
  );
}
