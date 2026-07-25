import "server-only";
import { count, desc, ilike, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { orderItems, orders, users } from "@/db/schema";
import { PAGE_SIZE, REVENUE_STATUSES } from "@/lib/admin/constants";

/**
 * Customers are joined to orders by email rather than user id, so a guest
 * checkout made with the same address still shows up against the account.
 */
export async function listCustomers(filters: { q?: string; page?: number } = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const term = filters.q?.trim() ? `%${filters.q.trim()}%` : null;
  const where = term ? or(ilike(users.name, term), ilike(users.email, term)) : undefined;

  const revenueStatuses = sql.raw(
    REVENUE_STATUSES.map((s) => `'${s}'`).join(", "),
  );

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
        orderCount: sql<number>`(
          select count(*)::int from orders o
          where o.email = ${users.email} and o.status in (${revenueStatuses})
        )`,
        spendCents: sql<number>`(
          select coalesce(sum(o.total_cents), 0)::int from orders o
          where o.email = ${users.email} and o.status in (${revenueStatuses})
        )`,
        lastOrderAt: sql<Date | null>`(
          select max(o.created_at) from orders o where o.email = ${users.email}
        )`,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ n: count(users.id) }).from(users).where(where),
  ]);

  const total = Number(totalRow[0]?.n ?? 0);
  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/**
 * Full profile for one customer (Step 16): their account, lifetime totals, and
 * the distinct products they've bought. Keyed by email so guest orders count.
 * Returns null if no such account exists.
 */
export async function getCustomerProfile(email: string) {
  const normalised = email.toLowerCase();

  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, normalised),
  });
  if (!user) return null;

  const revenueStatuses = sql.raw(REVENUE_STATUSES.map((s) => `'${s}'`).join(", "));

  const [[totals], productsBought, recentOrders] = await Promise.all([
    db
      .select({
        orderCount: sql<number>`count(*)::int`,
        spendCents: sql<number>`coalesce(sum(${orders.totalCents}), 0)::int`,
        lastOrderAt: sql<Date | null>`max(${orders.createdAt})`,
      })
      .from(orders)
      .where(sql`${orders.email} = ${normalised} and ${orders.status} in (${revenueStatuses})`),
    db
      .select({
        name: orderItems.nameSnapshot,
        slug: orderItems.slugSnapshot,
        units: sql<number>`sum(${orderItems.quantity})::int`,
      })
      .from(orderItems)
      .innerJoin(orders, sql`${orders.id} = ${orderItems.orderId}`)
      .where(sql`${orders.email} = ${normalised}`)
      .groupBy(orderItems.nameSnapshot, orderItems.slugSnapshot)
      .orderBy(desc(sql`sum(${orderItems.quantity})`)),
    db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        totalCents: orders.totalCents,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(sql`${orders.email} = ${normalised}`)
      .orderBy(desc(orders.createdAt)),
  ]);

  return {
    user,
    orderCount: Number(totals?.orderCount ?? 0),
    spendCents: Number(totals?.spendCents ?? 0),
    lastOrderAt: totals?.lastOrderAt ?? null,
    productsBought: productsBought.map((p) => ({ ...p, units: Number(p.units) })),
    recentOrders,
  };
}

/** Guests who ordered without ever creating an account. */
export async function getGuestBuyerCount() {
  const [row] = await db
    .select({ n: sql<number>`count(distinct ${orders.email})::int` })
    .from(orders)
    .where(sql`${orders.userId} is null`);
  return Number(row?.n ?? 0);
}
