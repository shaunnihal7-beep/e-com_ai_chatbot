"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * Site-wide motion preference.
 *
 * The OS setting is the default and always will be — but it is a blunt switch.
 * Windows folds scroll animation, window animation and UI easing into one
 * "Animation effects" toggle, and plenty of people turn it off for perceived
 * speed on an old machine rather than because motion makes them unwell. Those
 * users then get a site with every entrance, parallax and smooth-scroll
 * silently stripped out, and no way to ask for it back.
 *
 * So: honour the system by default, and let an explicit choice override it.
 * The choice persists, and everything motion-related in the app reads from
 * here rather than calling `useReducedMotion()` directly.
 */

export type MotionPreference = "system" | "full" | "reduced";

const STORAGE_KEY = "veloce-motion";

type MotionContextValue = {
  /** What the user picked. */
  preference: MotionPreference;
  /** What the OS reports, independent of the choice. */
  systemPrefersReduced: boolean;
  /** The resolved answer every component should branch on. */
  reduced: boolean;
  setPreference: (next: MotionPreference) => void;
};

const MotionContext = createContext<MotionContextValue | null>(null);

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<MotionPreference>("system");
  const [systemPrefersReduced, setSystemPrefersReduced] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const stored = localStorage.getItem(STORAGE_KEY) as MotionPreference | null;
    if (stored === "full" || stored === "reduced" || stored === "system") {
      setPreferenceState(stored);
    }

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setSystemPrefersReduced(query.matches);

    const onChange = (event: MediaQueryListEvent) =>
      setSystemPrefersReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const reduced =
    preference === "reduced" || (preference === "system" && systemPrefersReduced);

  // Mirror onto <html> so CSS can react too. Before mount we assume full
  // motion: the first paint has nothing animating yet, and assuming "reduced"
  // would make the hero pop in flat on every load for everyone.
  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? "reduced" : "full";
  }, [reduced]);

  const setPreference = useCallback((next: MotionPreference) => {
    setPreferenceState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(
    () => ({
      preference,
      systemPrefersReduced,
      // Until mounted we cannot know the OS setting, and guessing "reduced"
      // would cancel the entry sequence for everybody on the first frame.
      reduced: mounted ? reduced : false,
      setPreference,
    }),
    [preference, systemPrefersReduced, reduced, mounted, setPreference],
  );

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

/**
 * Replaces Framer's `useReducedMotion()` throughout the app, so a user override
 * reaches every animation rather than only the CSS ones.
 */
export function useMotionPreference(): MotionContextValue {
  const context = useContext(MotionContext);
  if (!context) {
    // Rendering outside the provider is a programming error, but a component
    // that animates should degrade to "animate" rather than throw.
    return {
      preference: "system",
      systemPrefersReduced: false,
      reduced: false,
      setPreference: () => {},
    };
  }
  return context;
}

/** Convenience for the common case. */
export function useReducedMotionPreference(): boolean {
  return useMotionPreference().reduced;
}
