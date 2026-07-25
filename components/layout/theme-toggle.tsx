"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useHydrated } from "@/lib/hooks/use-hydrated";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useHydrated();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      // The label has to stay theme-agnostic until mounted for the same reason
      // the icon does: the server has no idea which theme will resolve, and
      // guessing produced a hydration mismatch on every page load.
      aria-label={
        hydrated ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"
      }
      className="relative flex size-11 items-center justify-center transition-opacity hover:opacity-60"
    >
      {/* Render nothing until mounted — the server can't know the theme. */}
      {hydrated && (
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isDark ? "moon" : "sun"}
            initial={{ opacity: 0, rotate: -45, scale: 0.7 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 45, scale: 0.7 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex"
          >
            {isDark ? (
              <Moon className="size-[18px]" strokeWidth={1.6} />
            ) : (
              <Sun className="size-[18px]" strokeWidth={1.6} />
            )}
          </motion.span>
        </AnimatePresence>
      )}
    </button>
  );
}
