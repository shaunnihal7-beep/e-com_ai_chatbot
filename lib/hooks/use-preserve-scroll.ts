"use client";

import { useEffect } from "react";

/**
 * Holds the page's scroll position while a modal overlay is open.
 *
 * Base UI locks the background by setting `overflow: hidden` on <body>. On
 * desktop that is harmless, but mobile browsers clamp the scroll offset of a
 * document that has just become unscrollable — so opening the cart from a
 * product half way down the shop grid dumped the page back to the top, and
 * closing it left you there.
 *
 * Pinning the body with a compensating negative offset keeps the background
 * exactly where it was, then restores the real scroll position on close.
 * Only applied on coarse pointers: desktop does not need it, and taking <body>
 * out of flow would invalidate Lenis's cached dimensions.
 */
export function usePreserveScroll(open: boolean) {
  useEffect(() => {
    if (!open) return;
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    const y = window.scrollY;
    const { body } = document;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
    };

    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.left = "0";
    body.style.right = "0";

    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;

      // A single scrollTo here lands short. Base UI releases its own lock only
      // after the panel's exit animation finishes, and unsetting `overflow`
      // and `scrollbar-gutter` on <html> reflows the page out from under the
      // restore. So re-assert across the exit window instead of once, and bail
      // the moment the customer scrolls for themselves.
      const deadline = performance.now() + 500;
      let frame = 0;
      let cancelled = false;

      const stop = () => {
        cancelled = true;
        cancelAnimationFrame(frame);
        for (const event of ["wheel", "touchstart", "keydown"]) {
          window.removeEventListener(event, stop);
        }
      };

      for (const event of ["wheel", "touchstart", "keydown"]) {
        window.addEventListener(event, stop, { once: true, passive: true });
      }

      const settle = () => {
        if (cancelled) return;
        if (Math.abs(window.scrollY - y) > 1) {
          window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
          // Lenis keeps its own copy of the offset and would animate back to
          // whatever it last believed, undoing the line above.
          (window as unknown as { lenis?: LenisLike }).lenis?.scrollTo(y, {
            immediate: true,
            force: true,
          });
        }
        if (performance.now() < deadline) frame = requestAnimationFrame(settle);
        else stop();
      };

      settle();
    };
  }, [open]);
}

type LenisLike = {
  scrollTo: (target: number, options?: { immediate?: boolean; force?: boolean }) => void;
};
