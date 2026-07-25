"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "motion/react";

import { useReducedMotionPreference } from "@/components/providers/motion-provider";

const EASE = [0.16, 1, 0.3, 1] as const;

const TECHNOLOGIES = [
  {
    id: "aerocell",
    name: "AeroCell",
    claim: "Energy returned along the line it arrived",
    body: "A supercritical foam that compresses under load and gives it back in the same plane. Nothing is lost sideways, which is where most midsoles waste your effort.",
    stat: "84%",
    statLabel: "energy return",
  },
  {
    id: "meridian",
    name: "Meridian Plate",
    claim: "Carbon, tuned per size",
    body: "A full-length plate whose stiffness is set for each size rather than scaled from a single mould. A size 7 and a size 12 apply very different forces.",
    stat: "4.1%",
    statLabel: "measured efficiency gain",
  },
  {
    id: "gripskin",
    name: "GripSkin",
    claim: "Touch that survives the rain",
    body: "A micro-textured strike zone that holds the ball through the first centimetre of contact — the moment where a pass is actually decided.",
    stat: "2.3×",
    statLabel: "wet grip vs. smooth synthetic",
  },
  {
    id: "traction",
    name: "Court Mapping",
    claim: "Traction from data, not sketches",
    body: "Three seasons of pivot data turned into outsole geometry. The pattern looks arbitrary and is the precise opposite.",
    stat: "3 seasons",
    statLabel: "of court data",
  },
];

/**
 * Scroll-driven technology section.
 *
 * The left column pins while the right column scrolls past it; the image
 * cross-fades as each block enters. Pinning is `position: sticky` rather than
 * a scroll library, so there is no layout thrash and it degrades to a normal
 * stacked layout on mobile.
 */
export function PerformanceTech({ image }: { image: string }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotionPreference();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const imageScale = useTransform(scrollYProgress, [0, 1], [1.12, 1]);

  return (
    <section
      ref={ref}
      className="noise-overlay relative overflow-hidden bg-ink text-ink-foreground"
    >
      <div className="container-page section-y">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
          {/* Pinned column */}
          <div className="lg:sticky lg:top-28 lg:h-fit lg:self-start">
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: EASE }}
              className="text-eyebrow text-brand"
            >
              Performance technology
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: 0.08, ease: EASE }}
              className="mt-5 max-w-[13ch] text-display-lg"
            >
              What the shoe is actually doing.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: 0.16, ease: EASE }}
              className="mt-6 max-w-md text-body-lg text-ink-foreground/60"
            >
              Four systems, each solving a problem we could measure. If we could not
              measure it, it did not make it into the shoe.
            </motion.p>

            <div className="relative mt-12 hidden aspect-[4/3] w-full overflow-hidden rounded-xl lg:block">
              {image && (
                <motion.div
                  style={{ scale: reduced ? 1 : imageScale }}
                  className="absolute inset-0"
                >
                  <Image
                    src={image}
                    alt="Veloce midsole construction"
                    fill
                    sizes="45vw"
                    className="object-cover"
                  />
                </motion.div>
              )}
            </div>
          </div>

          {/* Scrolling column */}
          <div className="space-y-px">
            {TECHNOLOGIES.map((tech, i) => (
              <motion.article
                key={tech.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-15%" }}
                transition={{ duration: 0.8, ease: EASE }}
                className="border-t border-ink-foreground/15 py-10 first:border-t-0 lg:py-16"
              >
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-xs text-ink-foreground/40">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
                    {tech.name}
                  </h3>
                </div>

                <p className="mt-4 font-display text-lg text-brand md:text-xl">
                  {tech.claim}
                </p>

                <p className="mt-4 max-w-md leading-relaxed text-ink-foreground/60">
                  {tech.body}
                </p>

                <div className="mt-7 flex items-baseline gap-3">
                  <span className="font-display text-4xl font-bold tabular-nums md:text-5xl">
                    {tech.stat}
                  </span>
                  <span className="text-xs uppercase tracking-[0.15em] text-ink-foreground/45">
                    {tech.statLabel}
                  </span>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
