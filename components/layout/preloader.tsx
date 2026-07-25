"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { useReducedMotionPreference } from "@/components/providers/motion-provider";

const EASE = [0.83, 0, 0.17, 1] as const;

/**
 * First-visit entry sequence: the wordmark resolves, then two panels split
 * apart to reveal the page.
 *
 * Shown once per session (sessionStorage) — a preloader on every navigation
 * is an obstacle, not an experience. Gated on `document.fonts.ready` so the
 * wordmark never flashes in a fallback face.
 */
export function Preloader() {
  const reduced = useReducedMotionPreference();
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (reduced) return;
    if (sessionStorage.getItem("veloce-entered")) return;

    setVisible(true);
    document.body.style.overflow = "hidden";

    // Whichever resolves last: fonts, or a minimum beat so it doesn't flicker.
    const fonts = document.fonts?.ready ?? Promise.resolve();
    const minimum = new Promise((r) => setTimeout(r, 900));

    // `document.fonts.ready` stays pending forever if a webfont request hangs
    // — offline, or behind a proxy that blackholes fonts.googleapis.com. That
    // used to leave the overlay up and `overflow: hidden` latched on <body>,
    // killing scrolling for the whole session. The race caps the wait.
    const ceiling = new Promise((r) => setTimeout(r, 2500));

    Promise.race([Promise.all([fonts, minimum]), ceiling]).then(() => setReady(true));

    return () => {
      document.body.style.overflow = "";
    };
  }, [reduced]);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem("veloce-entered", "1");
      document.body.style.overflow = "";
    }, 620);
    return () => clearTimeout(timer);
  }, [ready]);

  return (
    <AnimatePresence>
      {visible && (
        <div className="pointer-events-none fixed inset-0 z-[100]">
          {/* Two halves that part vertically. */}
          {[0, 1].map((half) => (
            <motion.div
              key={half}
              initial={{ y: 0 }}
              animate={{ y: ready ? (half === 0 ? "-100%" : "100%") : 0 }}
              transition={{ duration: 0.85, ease: EASE }}
              className="absolute inset-x-0 h-1/2 bg-foreground"
              style={half === 0 ? { top: 0 } : { bottom: 0 }}
            />
          ))}

          <div className="absolute inset-0 grid place-items-center overflow-hidden">
            <motion.span
              initial={{ y: "110%" }}
              animate={{ y: ready ? "-110%" : 0 }}
              transition={{ duration: ready ? 0.6 : 0.9, ease: EASE }}
              className="font-display text-4xl font-bold tracking-[-0.06em] text-background md:text-6xl"
            >
              VELOCE
            </motion.span>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
