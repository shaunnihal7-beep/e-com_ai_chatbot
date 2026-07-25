"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { usePathname } from "next/navigation";

import { useReducedMotionPreference } from "@/components/providers/motion-provider";

/**
 * Lenis smooth scrolling, mounted once at the root.
 *
 * Disabled when motion is reduced, and on devices with no precise pointer —
 * phones already have excellent native inertial scrolling, and hijacking it
 * costs a frame budget better spent on the product images.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotionPreference();

  useEffect(() => {
    if (reduced) return;

    // `(pointer: coarse)` was the wrong test. It reports the *primary* pointer,
    // so a Windows touchscreen laptop — mouse, trackpad and all — can answer
    // "coarse" and lose smooth scrolling entirely. What we actually want to
    // know is whether a precise pointer exists at all.
    const hasFinePointer = window.matchMedia("(any-pointer: fine)").matches;
    if (!hasFinePointer) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    // Expose so the header's scroll-to-top and anchor links can drive it.
    (window as unknown as { lenis?: Lenis }).lenis = lenis;

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      delete (window as unknown as { lenis?: Lenis }).lenis;
    };
  }, [reduced]);

  // Route changes must land at the top, and Lenis holds its own scroll state.
  //
  // The resize is what keeps this honest: Lenis caches the document height, so
  // navigating from a long page to a short one (or back) leaves a stale scroll
  // limit behind and the tail of the new page becomes unreachable. Re-measuring
  // on the next frame — after the incoming route has painted — avoids that.
  useEffect(() => {
    const lenis = (window as unknown as { lenis?: Lenis }).lenis;
    if (!lenis) {
      window.scrollTo(0, 0);
      return;
    }

    lenis.scrollTo(0, { immediate: true });
    const frame = requestAnimationFrame(() => lenis.resize());
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return <>{children}</>;
}
