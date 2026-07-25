import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { setCartAbandoned } from "@/lib/hubspot";

/**
 * POST /api/cart/abandoned
 *
 * Fired by the client after the cart has sat idle (see CartAbandonmentWatcher).
 * We identify the shopper from their session cookie rather than trusting an
 * email in the body — so this only flags signed-in customers. Guests have no
 * contact to attach the flag to, so we simply no-op.
 *
 * Non-fatal by nature: this is a background signal, never user-facing.
 */
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: true, flagged: false });
  }

  try {
    await setCartAbandoned(session.email, true);
    return NextResponse.json({ ok: true, flagged: true });
  } catch (err) {
    console.error("[cart/abandoned] HubSpot flag failed:", err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
