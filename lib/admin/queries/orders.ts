import "server-only";
import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { orderItems, orders, users } from "@/db/schema";
import { PAGE_SIZE } from "@/lib/admin/constants";

export type OrderListFilters = {
  q?: string;
  status?: string;
  page?: number;
};

export async function listOrders(filters: OrderListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const conditions: SQL[] = [];

  if (filters.q?.trim()) {
    const term = `%${filters.q.trim()}%`;
    conditions.push(or(ilike(orders.orderNumber, term), ilike(orders.email, term))!);
  }
  if (filters.status && filters.status !== "all") {
    conditions.push(eq(orders.status, filters.status));
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        email: orders.email,
        status: orders.status,
        totalCents: orders.totalCents,
        createdAt: orders.createdAt,
        customerName: users.name,
        itemCount: sql<number>`(
          select coalesce(sum(oi.quantity), 0)::int
          from order_items oi where oi.order_id = ${orders.id}
        )`,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ n: count(orders.id) }).from(orders).where(where),
  ]);

  const total = Number(totalRow[0]?.n ?? 0);
  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getOrderDetail(id: number) {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, id) });
  if (!order) return null;

  const [items, customer] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)),
    order.userId
      ? db.query.users.findFirst({ where: eq(users.id, order.userId) })
      : Promise.resolve(undefined),
  ]);

  // Other orders from the same email, so support can see the buyer's history.
  const history = await db
    .select({ n: count(orders.id), spend: sql<number>`coalesce(sum(${orders.totalCents}),0)::int` })
    .from(orders)
    .where(eq(orders.email, order.email));

  return {
    ...order,
    items,
    customer: customer ?? null,
    lifetimeOrders: Number(history[0]?.n ?? 0),
    lifetimeSpendCents: Number(history[0]?.spend ?? 0),
  };
}

export async function getOrderStatusCounts() {
  const rows = await db
    .select({ status: orders.status, n: count(orders.id) })
    .from(orders)
    .groupBy(orders.status);

  const map = Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
  return { ...map, all: rows.reduce((sum, r) => sum + Number(r.n), 0) } as Record<
    string,
    number
  >;
}
