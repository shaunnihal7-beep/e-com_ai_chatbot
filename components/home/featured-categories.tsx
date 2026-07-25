"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import type { CategoryPreview } from "@/lib/queries/nav";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Sports / Football / Basketball.
 *
 * First tile spans two columns on desktop so the row reads as an editorial
 * layout rather than three equal boxes.
 */
export function FeaturedCategories({ categories }: { categories: CategoryPreview[] }) {
  return (
    <section className="container-page section-y">
      <Reveal>
        <p className="text-eyebrow text-brand">Find your surface</p>
        <h2 className="mt-4 max-w-[14ch] text-display-lg">Three sports. One standard.</h2>
      </Reveal>

      {/* Three equal columns on one row. The tiles previously used an
          editorial 2-1-1 span, which left the Sports card visibly taller than
          the other two — three matched plates read as deliberate instead. */}
      <div className="mt-14 grid gap-3 md:grid-cols-3 md:gap-4">
        {categories.map((category, i) => (
          <motion.div
            key={category.path}
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, delay: i * 0.1, ease: EASE }}
          >
            <Link
              href={`/shop/${category.path}`}
              className="group relative block h-full overflow-hidden rounded-xl bg-surface"
            >
              <div className="relative aspect-[4/5]">
                {category.image && (
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
                  />
                )}

                {/* Legibility scrim */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white md:p-7">
                  <div>
                    <h3 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
                      {category.name}
                    </h3>
                    <p className="mt-1 text-xs opacity-75">
                      {category.count} {category.count === 1 ? "style" : "styles"}
                    </p>
                  </div>

                  <span className="grid size-11 shrink-0 place-items-center rounded-full border border-white/30 transition-colors group-hover:border-white group-hover:bg-white group-hover:text-black">
                    <ArrowUpRight className="size-4" strokeWidth={1.8} />
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
