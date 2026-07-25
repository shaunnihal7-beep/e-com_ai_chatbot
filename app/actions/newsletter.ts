"use server";

import { z } from "zod";

import { subscribeNewsletter } from "@/lib/hubspot";

const schema = z.string().email();

/**
 * Newsletter signup (Step 20): the subscriber becomes a HubSpot contact flagged
 * `newsletter_subscribed = Yes`, which a HubSpot Active List uses as the
 * marketing list. HubSpot failure is non-fatal — we don't block the signup UX
 * over a CRM hiccup, but we do log it.
 */
export async function subscribeAction(
  email: string,
): Promise<{ ok: boolean; message: string }> {
  const parsed = schema.safeParse(email);
  if (!parsed.success) {
    return { ok: false, message: "That doesn't look like a valid email address." };
  }

  try {
    await subscribeNewsletter(parsed.data.toLowerCase());
  } catch (err) {
    console.error("[newsletter] HubSpot subscribe failed:", err);
  }

  return { ok: true, message: "You're on the list. Watch your inbox." };
}
