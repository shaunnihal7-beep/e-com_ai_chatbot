"use client";

import { useEffect, useRef } from "react";

import { useCart } from "@/lib/stores/cart";

/**
 * Step 18 — abandoned-cart detection.
 *
 * Watches for inactivity while the cart has items. After ABANDON_MS with no
 * user interaction, it pings /api/cart/abandoned, which flags the signed-in
 * customer's HubSpot contact (cart_abandoned = Yes). A HubSpot Workflow then
 * sends the reminder email.
 *
 * The cart lives only in the browser (Zustand + localStorage), so this timer
 * is the trigger — there is no server-side cart to run a cron against. The
 * request carries no body; the API route identifies the shopper from their
 * session cookie.
 */

// 30 minutes, per the spec. Lower this (e.g. 30_000) to demo it quickly.
const ABANDON_MS = 30 * 60 * 1000;

const ACTIVITY_EVENTS = ["mousemove", "keydown", "pointerdown", "scroll", "touchstart"] as const;

export function CartAbandonmentWatcher() {
  const hasItems = useCart((s) => s.lines.length > 0);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!hasItems) return;

    // A fresh cart change means the cart is active again.
    firedRef.current = false;
    let timer: ReturnType<typeof setTimeout>;

    const fire = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      // keepalive lets the request outlive a tab close / navigation.
      fetch("/api/cart/abandoned", { method: "POST", keepalive: true }).catch(() => {});
    };

    const arm = () => {
      clearTimeout(timer);
      if (!firedRef.current) timer = setTimeout(fire, ABANDON_MS);
    };

    arm();
    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, arm, { passive: true });
    }

    return () => {
      clearTimeout(timer);
      for (const ev of ACTIVITY_EVENTS) window.removeEventListener(ev, arm);
    };
  }, [hasItems]);

  return null;
}
