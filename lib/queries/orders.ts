import "server-only";
import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";

export type OrderView = typeof orders.$inferSelect & {
  items: (typeof orderItems.$inferSelect)[];
};

export type ShippingAddress = {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
  country: string;
};

export async function getOrdersForUser(userId: number): Promise<OrderView[]> {
  return db.query.orders.findMany({
    where: eq(orders.userId, userId),
    with: { items: true },
    orderBy: [desc(orders.createdAt)],
  });
}

export async function getOrderByNumber(orderNumber: string): Promise<OrderView | null> {
  const row = await db.query.orders.findFirst({
    where: eq(orders.orderNumber, orderNumber),
    with: { items: true },
  });
  return row ?? null;
}

/** VLC-XXXXXX. Collision risk is irrelevant at demo scale. */
export function generateOrderNumber(): string {
  return `VLC-${Math.floor(100000 + Math.random() * 900000)}`;
}

export type CustomerOrderStats = {
  totalOrders: number;
  lifetimeSpendCents: number;
  lastPurchaseDate: Date | null;
};

/**
 * Aggregate a customer's lifetime order history, keyed by email so it covers
 * both logged-in and guest checkouts. Feeds the HubSpot CRM sync so a contact's
 * Total Orders / Lifetime Spend / Last Purchase Date reflect every purchase.
 */
export async function getCustomerOrderStats(email: string): Promise<CustomerOrderStats> {
  const [row] = await db
    .select({
      totalOrders: sql<number>`count(*)::int`,
      lifetimeSpendCents: sql<number>`coalesce(sum(${orders.totalCents}), 0)::int`,
      lastPurchaseDate: sql<Date | null>`max(${orders.createdAt})`,
    })
    .from(orders)
    .where(eq(orders.email, email.toLowerCase()));

  return {
    totalOrders: row?.totalOrders ?? 0,
    lifetimeSpendCents: row?.lifetimeSpendCents ?? 0,
    lastPurchaseDate: row?.lastPurchaseDate ?? null,
  };
}
