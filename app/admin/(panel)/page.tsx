import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { AlertTriangle, Package, Star } from "lucide-react";

import { formatPrice } from "@/lib/format";
import {
  getActivityFeed,
  getContentCounts,
  getCustomerStats,
  getInventoryTotals,
  getOrderStatusBreakdown,
  getRecentOrders,
  getRevenueSeries,
  getSalesSummary,
  getStockAlerts,
  getTopProducts,
} from "@/lib/admin/queries/dashboard";
import { getGuestBuyerCount } from "@/lib/admin/queries/customers";
import { RevenueChart } from "@/components/admin/revenue-chart";
import {
  EmptyState,
  PageHeader,
  Panel,
  StatCard,
  StatusBadge,
  StockBadge,
} from "@/components/admin/ui";

export const metadata: Metadata = { title: "Dashboard" };

// The dashboard reads live figures on every visit — a cached number here would
// be worse than a slightly slower page.
export const dynamic = "force-dynamic";

const RANGE = 30;

function relativeTime(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function AdminDashboardPage() {
  const [
    sales,
    series,
    recentOrders,
    statusBreakdown,
    topProducts,
    stockAlerts,
    inventory,
    customers,
    guests,
    counts,
    activity,
  ] = await Promise.all([
    getSalesSummary(RANGE),
    getRevenueSeries(RANGE),
    getRecentOrders(6),
    getOrderStatusBreakdown(),
    getTopProducts(5, RANGE),
    getStockAlerts(6),
    getInventoryTotals(),
    getCustomerStats(RANGE),
    getGuestBuyerCount(),
    getContentCounts(),
    getActivityFeed(10),
  ]);

  const openOrders = statusBreakdown
    .filter((s) => ["pending", "confirmed", "processing"].includes(s.status))
    .reduce((sum, s) => sum + s.count, 0);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Store performance over the last ${RANGE} days.`}
      />

      {/* Sales summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Revenue"
          value={formatPrice(sales.revenueCents)}
          change={sales.revenueChange}
          hint="vs previous 30 days"
        />
        <StatCard
          label="Orders"
          value={String(sales.orderCount)}
          change={sales.orderChange}
          hint="vs previous 30 days"
          href="/admin/orders"
        />
        <StatCard
          label="Average order"
          value={formatPrice(sales.avgOrderCents)}
          hint={`${sales.unitsSold} units sold`}
        />
        <StatCard
          label="Customers"
          value={String(customers.total)}
          hint={`${customers.newInPeriod} new · ${customers.repeat} repeat`}
          href="/admin/customers"
        />
      </div>

      {/* Revenue graph */}
      <div className="mt-4">
        <Panel title="Revenue" description={`Daily takings across the last ${RANGE} days.`}>
          <RevenueChart data={series} />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Orders overview */}
        <Panel
          title="Orders overview"
          description={`${openOrders} awaiting fulfilment`}
          className="lg:col-span-2"
          action={
            <Link href="/admin/orders" className="text-xs underline underline-offset-2">
              All orders
            </Link>
          }
        >
          <div className="mb-4 flex flex-wrap gap-2">
            {statusBreakdown.map((entry) => (
              <Link
                key={entry.status}
                href={`/admin/orders?status=${entry.status}`}
                className="rounded-lg border border-border px-3 py-2 hover:bg-muted"
              >
                <span className="block text-lg font-semibold tabular-nums">{entry.count}</span>
                <span className="text-xs text-muted-foreground capitalize">{entry.status}</span>
              </Link>
            ))}
          </div>

          {recentOrders.length === 0 ? (
            <EmptyState title="No orders yet" description="Orders will appear here as they come in." />
          ) : (
            <ul className="divide-y divide-border">
              {recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 hover:bg-muted"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{order.orderNumber}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {order.email} · {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <StatusBadge status={order.status} />
                      <span className="text-sm font-medium tabular-nums">
                        {formatPrice(order.totalCents)}
                      </span>
                      <span className="hidden w-16 text-right text-xs text-muted-foreground sm:block">
                        {relativeTime(order.createdAt)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Activity feed */}
        <Panel title="Recent activity" description="Everything your team has changed.">
          {activity.length === 0 ? (
            <EmptyState title="Nothing yet" description="Edits made in the CMS show up here." />
          ) : (
            <ul className="space-y-3">
              {activity.map((entry) => (
                <li key={entry.id} className="flex gap-2.5">
                  <span
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="text-sm leading-snug">{entry.summary}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.actorName} · {relativeTime(entry.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Top products */}
        <Panel
          title="Top products"
          description={`Best sellers over ${RANGE} days`}
          className="lg:col-span-2"
        >
          {topProducts.length === 0 ? (
            <EmptyState title="No sales yet" description="Your best sellers will be listed here." />
          ) : (
            <ol className="divide-y divide-border">
              {topProducts.map((product, index) => (
                <li key={`${product.productId}-${product.slug}`} className="flex items-center gap-3 py-2.5">
                  <span className="w-4 shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
                    {index + 1}
                  </span>

                  {product.image ? (
                    <Image
                      src={product.image}
                      alt=""
                      width={40}
                      height={50}
                      className="size-10 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Package className="size-4 text-muted-foreground" aria-hidden />
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.units} sold</p>
                  </div>

                  <span className="shrink-0 text-sm font-medium tabular-nums">
                    {formatPrice(product.revenueCents)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        {/* Inventory alerts */}
        <Panel
          title="Inventory alerts"
          description={`${inventory.outOfStock} out of stock · ${inventory.low} low`}
          action={
            <Link href="/admin/inventory" className="text-xs underline underline-offset-2">
              Manage
            </Link>
          }
        >
          {stockAlerts.length === 0 ? (
            <EmptyState title="Stock is healthy" description="No sizes are running low." />
          ) : (
            <ul className="space-y-2.5">
              {stockAlerts.map((alert) => (
                <li
                  key={`${alert.productId}-${alert.colorName}-${alert.size}`}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/products/${alert.productId}`}
                      className="block truncate text-sm font-medium hover:underline"
                    >
                      {alert.productName}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {alert.colorName} · US {alert.size}
                    </p>
                  </div>
                  <StockBadge stock={alert.stock} threshold={alert.threshold} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Secondary stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Published products"
          value={String(counts.productsPublished)}
          hint={`${counts.productsDraft} drafts · ${counts.productsArchived} archived`}
          href="/admin/products"
        />
        <StatCard
          label="Units in stock"
          value={String(inventory.totalUnits)}
          hint={`${inventory.low} low · ${inventory.outOfStock} out`}
          href="/admin/inventory"
        />
        <StatCard
          label="Reviews awaiting"
          value={String(counts.reviewsPending)}
          hint={`${counts.reviewsApproved} approved`}
          href="/admin/reviews"
        />
        <StatCard
          label="Guest buyers"
          value={String(guests)}
          hint="checked out without an account"
        />
      </div>

      {/* Notifications strip — only rendered when something needs attention. */}
      {counts.reviewsPending > 0 || stockAlerts.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {stockAlerts.length > 0 ? (
            <Link
              href="/admin/inventory"
              className="flex items-start gap-3 rounded-xl border border-brand/30 bg-brand-muted p-4"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              <div>
                <p className="text-sm font-medium">Low stock needs attention</p>
                <p className="text-xs text-muted-foreground">
                  {inventory.low} size{inventory.low === 1 ? "" : "s"} running low and{" "}
                  {inventory.outOfStock} out of stock.
                </p>
              </div>
            </Link>
          ) : null}

          {counts.reviewsPending > 0 ? (
            <Link
              href="/admin/reviews?status=pending"
              className="flex items-start gap-3 rounded-xl border border-border bg-background p-4"
            >
              <Star className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              <div>
                <p className="text-sm font-medium">Reviews awaiting moderation</p>
                <p className="text-xs text-muted-foreground">
                  {counts.reviewsPending} review{counts.reviewsPending === 1 ? "" : "s"} pending
                  approval.
                </p>
              </div>
            </Link>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
