"use server";

import { z } from "zod";

import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { generateOrderNumber, getCustomerOrderStats } from "@/lib/queries/orders";
import { syncContactOrderStats, createDeal } from "@/lib/hubspot";
import type { CartLine } from "@/lib/types";

const addressSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name."),
  email: z.string().email("Please enter a valid email address."),
  line1: z.string().trim().min(3, "Please enter your address."),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(2, "Please enter your city."),
  postcode: z.string().trim().min(3, "Please enter your postcode."),
  country: z.string().trim().min(2, "Please choose a country."),
});

const lineSchema = z.object({
  productId: z.number().int().positive(),
  slug: z.string(),
  name: z.string(),
  colorSlug: z.string(),
  colorName: z.string(),
  size: z.number(),
  quantity: z.number().int().positive().max(20),
  unitPriceCents: z.number().int().nonnegative(),
  image: z.string(),
});

export type CheckoutResult =
  | { ok: true; orderNumber: string }
  | { ok: false; message: string };

const FREE_SHIPPING_THRESHOLD = 15000;
const STANDARD_SHIPPING = 995;

export async function placeOrderAction(
  address: z.input<typeof addressSchema>,
  lines: CartLine[],
): Promise<CheckoutResult> {
  const parsedAddress = addressSchema.safeParse(address);
  if (!parsedAddress.success) {
    return { ok: false, message: parsedAddress.error.issues[0].message };
  }

  const parsedLines = z.array(lineSchema).min(1).safeParse(lines);
  if (!parsedLines.success) {
    return { ok: false, message: "Your cart is empty." };
  }

  // Totals are recomputed server-side — the client is never trusted for money.
  const items = parsedLines.data;
  const subtotal = items.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
  const tax = Math.round(subtotal * 0.08);

  const session = await getSession();
  const { email, ...shippingAddress } = parsedAddress.data;

  const [order] = await db
    .insert(orders)
    .values({
      orderNumber: generateOrderNumber(),
      userId: session?.id ?? null,
      email,
      status: "confirmed",
      subtotalCents: subtotal,
      shippingCents: shipping,
      taxCents: tax,
      totalCents: subtotal + shipping + tax,
      shippingAddress,
    })
    .returning({ id: orders.id, orderNumber: orders.orderNumber });

  await db.insert(orderItems).values(
    items.map((line) => ({
      orderId: order.id,
      productId: line.productId,
      nameSnapshot: line.name,
      colorSnapshot: line.colorName,
      imageSnapshot: line.image,
      slugSnapshot: line.slug,
      size: line.size,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
    })),
  );

  // Sync CRM — push the customer's updated lifetime stats to HubSpot. Kept
  // non-fatal: a CRM outage must never fail a paid order that's already saved.
  try {
    const stats = await getCustomerOrderStats(email);
    const contactId = await syncContactOrderStats({ email, ...stats });
    await createDeal({
      contactId,
      orderNumber: order.orderNumber,
      amountCents: subtotal + shipping + tax,
    });
  } catch (err) {
    console.error("[checkout] HubSpot CRM sync failed:", err);
  }

  return { ok: true, orderNumber: order.orderNumber };
}
