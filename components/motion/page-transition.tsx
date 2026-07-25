"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

import { useReducedMotionPreference } from "@/components/providers/motion-provider";
import type { ReactNode } from "react";

/**
 * Route-level cross-fade.
 *
 * Kept deliberately short (0.35s) and opacity-only: a heavier transition
 * makes navigation feel slower than it is, which is the opposite of premium.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotionPreference();

  if (reduced) return <>{children}</>;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
