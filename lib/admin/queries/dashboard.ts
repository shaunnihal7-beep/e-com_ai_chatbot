import "server-only";
import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  activityLog,
  orderItems,
  orders,
  productColors,
  productSizes,
  products,
  reviews,
  users,
} from "@/db/schema";
import { DEFAULT_LOW_STOCK_THRESHOLD, REVENUE_STATUSES } from "@/lib/admin/constants";

/** Midnight N days ago, local time. */
function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

/** Orders that count as revenue — cancelled and refunded never do. */
const countsAsRevenue = inArray(orders.status, [...REVENUE_STATUSES]);

export type SalesSummary = {
  revenueCents: number;
  orderCount: number;
  avgOrderCents: number;
  unitsSold: number;
  /** Percent change against the immediately preceding window of equal length. */
  revenueChange: number | null;
  orderChange: number | null;
};

async function windowTotals(from: Date, to?: Date) {
  const where = to
    ? and(countsAsRevenue, gte(orders.createdAt, from), sql`${orders.createdAt} < ${to}`)
    : and(countsAsRevenue, gte(orders.createdAt, from));

  const [row] = await db
    .select({
      revenue: sql<number>`coalesce(sum(${orders.totalCents}), 0)::int`,
      orders: count(orders.id),
    })
    .from(orders)
    .where(where);

  return { revenue: Number(row?.revenue ?? 0), orders: Number(row?.orders ?? 0) };
}

function pctChange(current: number, previous: number): number | null {
  // No baseline means "no comparison", not "infinite growth".
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export async function getSalesSummary(days = 30): Promise<SalesSummary> {
  const from = daysAgo(days - 1);
  const prevFrom = daysAgo(days * 2 - 1);

  const [current, previous, unitsRow] = await Promise.all([
    windowTotals(from),
    windowTotals(prevFrom, from),
    db
      .select({ units: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int` })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(countsAsRevenue, gte(orders.createdAt, from))),
  ]);

  return {
    revenueCents: current.revenue,
    orderCount: current.orders,
    avgOrderCents: current.orders ? Math.round(current.revenue / current.orders) : 0,
    unitsSold: Number(unitsRow[0]?.units ?? 0),
    revenueChange: pctChange(current.revenue, previous.revenue),
    orderChange: pctChange(current.orders, previous.orders),
  };
}

/* ------------------------------------------------------------------ */
/* Revenue graph                                                       */
/* ------------------------------------------------------------------ */

export type RevenuePoint = { date: string; revenueCents: number; orders: number };

/**
 * One row per day including days with no orders — a gap-free series, so the
 * chart never has to guess at missing points.
 */
export async function getRevenueSeries(days = 30): Promise<RevenuePoint[]> {
  const from = daysAgo(days - 1);

  const rows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${orders.createdAt}), 'YYYY-MM-DD')`,
      revenue: sql<number>`coalesce(sum(${orders.totalCents}), 0)::int`,
      orders: count(orders.id),
    })
    .from(orders)
    .where(and(countsAsRevenue, gte(orders.createdAt, from)))
    .groupBy(sql`date_trunc('day', ${orders.createdAt})`);

  const byDay = new Map(rows.map((r) => [r.day, r]));
  const series: RevenuePoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = daysAgo(i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
    const row = byDay.get(key);
    series.push({
      date: key,
      revenueCents: Number(row?.revenue ?? 0),
      orders: Number(row?.orders ?? 0),
    });
  }

  return series;
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export async function getRecentOrders(limit = 8) {
  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      email: orders.email,
      status: orders.status,
      totalCents: orders.totalCents,
      createdAt: orders.createdAt,
      itemCount: sql<number>`(
        select coalesce(sum(oi.quantity), 0)::int
        from order_items oi where oi.order_id = ${orders.id}
      )`,
    })
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(limit);
}

/** Count per status, for the orders-overview strip. */
export async function getOrderStatusBreakdown() {
  const rows = await db
    .select({
      status: orders.status,
      count: count(orders.id),
      totalCents: sql<number>`coalesce(sum(${orders.totalCents}), 0)::int`,
    })
    .from(orders)
    .groupBy(orders.status);

  return rows.map((r) => ({
    status: r.status,
    count: Number(r.count),
    totalCents: Number(r.totalCents),
  }));
}

/* ------------------------------------------------------------------ */
/* Top products                                                        */
/* ------------------------------------------------------------------ */

export type TopProduct = {
  productId: number | null;
  name: string;
  slug: string;
  units: number;
  revenueCents: number;
  image: string | null;
};

export async function getTopProducts(limit = 6, days = 30): Promise<TopProduct[]> {
  const from = daysAgo(days - 1);

  const rows = await db
    .select({
      productId: orderItems.productId,
      name: sql<string>`max(${orderItems.nameSnapshot})`,
      slug: sql<string>`max(${orderItems.slugSnapshot})`,
      image: sql<string>`max(${orderItems.imageSnapshot})`,
      units: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
      revenue: sql<number>`coalesce(sum(${orderItems.quantity} * ${orderItems.unitPriceCents}), 0)::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(countsAsRevenue, gte(orders.createdAt, from)))
    .groupBy(orderItems.productId)
    .orderBy(desc(sql`sum(${orderItems.quantity} * ${orderItems.unitPriceCents})`))
    .limit(limit);

  return rows.map((r) => ({
    productId: r.productId,
    name: r.name,
    slug: r.slug,
    image: r.image,
    units: Number(r.units),
    revenueCents: Number(r.revenue),
  }));
}

/* ------------------------------------------------------------------ */
/* Inventory                                                           */
/* ------------------------------------------------------------------ */

export type StockAlert = {
  sizeId: number;
  productId: number;
  productName: string;
  productSlug: string;
  status: string;
  colorName: string;
  size: number;
  stock: number;
  threshold: number;
};

/**
 * Size rows at or below their product's threshold. Archived products are
 * excluded — they aren't for sale, so their stock isn't actionable.
 */
export async function getStockAlerts(limit = 50): Promise<StockAlert[]> {
  const rows = await db
    .select({
      sizeId: productSizes.id,
      productId: products.id,
      productName: products.name,
      productSlug: products.slug,
      status: products.status,
      colorName: productColors.name,
      size: productSizes.size,
      stock: productSizes.stock,
      threshold: sql<number>`coalesce(${products.lowStockThreshold}, ${DEFAULT_LOW_STOCK_THRESHOLD})`,
    })
    .from(productSizes)
    .innerJoin(productColors, eq(productSizes.colorId, productColors.id))
    .innerJoin(products, eq(productColors.productId, products.id))
    .where(
      and(
        sql`${products.status} <> 'archived'`,
        sql`${productSizes.stock} <= coalesce(${products.lowStockThreshold}, ${DEFAULT_LOW_STOCK_THRESHOLD})`,
      ),
    )
    .orderBy(productSizes.stock, products.name)
    .limit(limit);

  return rows.map((r) => ({ ...r, threshold: Number(r.threshold) }));
}

export async function getInventoryTotals() {
  const [row] = await db
    .select({
      totalUnits: sql<number>`coalesce(sum(${productSizes.stock}), 0)::int`,
      outOfStock: sql<number>`count(*) filter (where ${productSizes.stock} = 0)::int`,
      low: sql<number>`count(*) filter (where ${productSizes.stock} > 0 and ${productSizes.stock} <= coalesce(${products.lowStockThreshold}, ${DEFAULT_LOW_STOCK_THRESHOLD}))::int`,
    })
    .from(productSizes)
    .innerJoin(productColors, eq(productSizes.colorId, productColors.id))
    .innerJoin(products, eq(productColors.productId, products.id))
    .where(sql`${products.status} <> 'archived'`);

  return {
    totalUnits: Number(row?.totalUnits ?? 0),
    outOfStock: Number(row?.outOfStock ?? 0),
    low: Number(row?.low ?? 0),
  };
}

/* ------------------------------------------------------------------ */
/* Customers                                                           */
/* ------------------------------------------------------------------ */

export async function getCustomerStats(days = 30) {
  const from = daysAgo(days - 1);

  const [totals, newRow, repeatRow] = await Promise.all([
    db.select({ total: count(users.id) }).from(users),
    db.select({ total: count(users.id) }).from(users).where(gte(users.createdAt, from)),
    // Customers with more than one revenue-bearing order, keyed on email so
    // guest checkouts count alongside signed-in ones.
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(
        db
          .select({ email: orders.email })
          .from(orders)
          .where(countsAsRevenue)
          .groupBy(orders.email)
          .having(sql`count(*) > 1`)
          .as("repeat_buyers"),
      ),
  ]);

  return {
    total: Number(totals[0]?.total ?? 0),
    newInPeriod: Number(newRow[0]?.total ?? 0),
    repeat: Number(repeatRow[0]?.total ?? 0),
  };
}

/* ------------------------------------------------------------------ */
/* Counts & feed                                                       */
/* ------------------------------------------------------------------ */

export async function getContentCounts() {
  const [productRows, reviewRows] = await Promise.all([
    db.select({ status: products.status, n: count(products.id) }).from(products).groupBy(products.status),
    db.select({ status: reviews.status, n: count(reviews.id) }).from(reviews).groupBy(reviews.status),
  ]);

  const pick = (rows: { status: string; n: number }[], key: string) =>
    Number(rows.find((r) => r.status === key)?.n ?? 0);

  return {
    productsPublished: pick(productRows, "published"),
    productsDraft: pick(productRows, "draft"),
    productsArchived: pick(productRows, "archived"),
    reviewsPending: pick(reviewRows, "pending"),
    reviewsApproved: pick(reviewRows, "approved"),
    reviewsRejected: pick(reviewRows, "rejected"),
  };
}

export async function getActivityFeed(limit = 12) {
  return db
    .select()
    .from(activityLog)
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}
