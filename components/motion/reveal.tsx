"use client";

import { motion, type Variants } from "motion/react";

import { useReducedMotionPreference } from "@/components/providers/motion-provider";
import type { ElementType, ReactNode } from "react";

/**
 * Motion primitives shared by every section.
 *
 * House rules, enforced here so individual components can't break them:
 *   - only `transform` and `opacity` animate (both composited)
 *   - every entrance is viewport-triggered and fires once
 *   - `prefers-reduced-motion` collapses everything to a plain fade
 */

const EASE = [0.16, 1, 0.3, 1] as const;

type RevealProps = {
  children: ReactNode;
  /** Seconds. Use for deliberate sequencing, not to fake a stagger. */
  delay?: number;
  /** Travel distance in px. 0 gives a pure fade. */
  y?: number;
  className?: string;
  as?: ElementType;
  once?: boolean;
};

export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  as = "div",
  once = true,
}: RevealProps) {
  const reduced = useReducedMotionPreference();
  const MotionTag = motion[as as keyof typeof motion] as typeof motion.div;

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: reduced ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-80px" }}
      transition={{ duration: reduced ? 0.3 : 0.85, delay, ease: EASE }}
    >
      {children}
    </MotionTag>
  );
}

/** Parent for staggered children. Pair with <StaggerItem>. */
export function Stagger({
  children,
  className,
  delay = 0,
  gap = 0.07,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  gap?: number;
  once?: boolean;
}) {
  const reduced = useReducedMotionPreference();

  const variants: Variants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduced ? 0 : gap,
        delayChildren: delay,
      },
    },
  };

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-60px" }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  y = 24,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
}) {
  const reduced = useReducedMotionPreference();

  const variants: Variants = {
    hidden: { opacity: 0, y: reduced ? 0 : y },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduced ? 0.3 : 0.7, ease: EASE },
    },
  };

  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  );
}

/**
 * Splits a headline into words so they can cascade in from below a mask.
 * Each word gets its own overflow-hidden wrapper — the mask is what makes
 * this read as typographic rather than as a generic fade.
 */
export function SplitWords({
  text,
  className,
  delay = 0,
  stagger = 0.055,
  as: Tag = "span",
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  as?: ElementType;
}) {
  const reduced = useReducedMotionPreference();
  const words = text.split(" ");

  if (reduced) {
    return <Tag className={className}>{text}</Tag>;
  }

  return (
    <Tag className={className} aria-label={text}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          aria-hidden
          className="inline-block overflow-hidden align-bottom"
          // Descenders would otherwise be clipped by the mask.
          style={{ paddingBottom: "0.12em", marginBottom: "-0.12em" }}
        >
          <motion.span
            className="inline-block"
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            transition={{
              duration: 0.95,
              delay: delay + i * stagger,
              ease: EASE,
            }}
          >
            {word}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

export { EASE };
