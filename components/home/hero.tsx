"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

import { useReducedMotionPreference } from "@/components/providers/motion-provider";
import { ArrowDown } from "lucide-react";

import { SplitWords } from "@/components/motion/reveal";
import { Magnetic } from "@/components/motion/magnetic";
import { ButtonLink } from "@/components/ui/button-link";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Full-viewport opening statement.
 *
 * The product plate and the type move at different scroll rates to build
 * depth; both are transform-only so the whole thing stays on the compositor.
 */
export function Hero({
  product,
}: {
  product: { slug: string; name: string; image: string; alt: string };
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotionPreference();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "42%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    /* `bg-ink`, not `bg-foreground`: this slab has to stay dark in both themes.
       Inverting it turned the hero white in dark mode, which left the header's
       white overlay type invisible against it. */
    <section
      ref={ref}
      className="noise-overlay relative flex min-h-[100dvh] items-center overflow-hidden bg-ink text-ink-foreground"
    >
      {/* Oversized ghost wordmark behind everything. */}
      <motion.span
        aria-hidden
        style={{ y: reduced ? 0 : imageY }}
        className="pointer-events-none absolute -right-[8%] top-1/2 -translate-y-1/2 select-none font-display font-bold leading-none tracking-[-0.06em] text-ink-foreground/[0.04]"
      >
        <span style={{ fontSize: "clamp(14rem, 34vw, 40rem)" }}>V</span>
      </motion.span>

      {/* Product plate */}
      <motion.div
        style={{ y: reduced ? 0 : imageY }}
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[52%] items-center justify-center lg:flex"
      >
        <motion.div
          initial={{ opacity: 0, scale: 1.06, rotate: -4 }}
          animate={{ opacity: 1, scale: 1, rotate: -6 }}
          transition={{ duration: 1.4, delay: 0.35, ease: EASE }}
          className="relative aspect-[4/5] w-[76%] overflow-hidden rounded-2xl"
        >
          {product.image && (
            <Image
              src={product.image}
              alt={product.alt}
              fill
              priority
              // The plate is `hidden` below lg. Resolving `sizes` to 1px there
              // makes the browser preload a 16px candidate instead of a full
              // 640px hero image it will never paint.
              sizes="(min-width: 1024px) 45vw, 1px"
              className="object-cover"
            />
          )}
        </motion.div>
      </motion.div>

      {/* Copy */}
      <motion.div
        style={{ y: reduced ? 0 : textY, opacity: reduced ? 1 : fade }}
        className="container-page relative z-10 w-full pb-28 pt-32"
      >
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
          className="text-eyebrow text-brand"
        >
          New Season — Race Series
        </motion.p>

        {/* Capped on lg so the headline never runs under the product plate. */}
        <h1 className="mt-6 max-w-[15ch] text-display-2xl lg:max-w-[52%]">
          <SplitWords text="Built for" delay={0.25} />
          <br />
          <SplitWords text="minute ninety." delay={0.4} />
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.85, ease: EASE }}
          className="mt-8 max-w-md text-body-lg text-ink-foreground/65"
        >
          Every last, plate and outsole in the range answers one question — what does
          the athlete need when it stops being easy?
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1, ease: EASE }}
          className="mt-10 flex flex-wrap items-center gap-3"
        >
          <Magnetic>
            <ButtonLink
              className="h-14 rounded-full bg-ink-foreground px-9 text-sm font-semibold text-ink hover:bg-ink-foreground/90"
              href="/shop"
            >
              Shop the range
            </ButtonLink>
          </Magnetic>

          <Magnetic>
            <ButtonLink
              variant="outline"
              className="h-14 rounded-full border-ink-foreground/30 bg-transparent px-9 text-sm font-semibold text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground"
              href={`/product/${product.slug}`}
            >
              The {product.name}
            </ButtonLink>
          </Magnetic>
        </motion.div>
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.8 }}
        style={{ opacity: reduced ? 1 : fade }}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
      >
        <motion.span
          animate={reduced ? {} : { y: [0, 7, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-2 text-ink-foreground/50"
        >
          <span className="text-[10px] uppercase tracking-[0.2em]">Scroll</span>
          <ArrowDown className="size-4" strokeWidth={1.5} />
        </motion.span>
      </motion.div>
    </section>
  );
}
