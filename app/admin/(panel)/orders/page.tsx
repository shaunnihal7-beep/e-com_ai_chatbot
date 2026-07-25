import Link from "next/link";
import type { Metadata } from "next";

import { formatPrice } from "@/lib/format";
import { ORDER_STATUSES } from "@/lib/admin/constants";
import { getOrderStatusCounts, listOrders } from "@/lib/admin/queries/orders";
import { FilterTabs, Pagination, SearchInput } from "@/components/admin/filters";
import {
  EmptyState,
  PageHeader,
  StatusBadge,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";

export const metadata: Metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

function relativeDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  const [{ rows, total, page, pageCount }, counts] = await Promise.all([
    listOrders({
      q: params.q,
      status: params.status,
      page: params.page ? Number(params.page) : 1,
    }),
    getOrderStatusCounts(),
  ]);

  return (
    <>
      <PageHeader title="Orders" description="Every order placed on the storefront." />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs
          options={[
            { value: "all", label: "All", count: counts.all },
            ...ORDER_STATUSES.filter((s) => counts[s]).map((s) => ({
              value: s,
              label: s.charAt(0).toUpperCase() + s.slice(1),
              count: counts[s],
            })),
          ]}
        />
        <SearchInput placeholder="Order number or email…" />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No orders found"
          description="Orders will appear here as customers check out."
        />
      ) : (
        <>
          <TableShell>
            <thead>
              <tr>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th>Items</Th>
                <Th>Total</Th>
                <Th>Status</Th>
                <Th>Placed</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((order) => (
                <tr key={order.id} className="hover:bg-muted/50">
                  <Td>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-medium hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </Td>
                  <Td>
                    <span className="block text-sm">{order.customerName ?? "Guest"}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {order.email}
                    </span>
                  </Td>
                  <Td className="tabular-nums text-muted-foreground">{order.itemCount}</Td>
                  <Td className="font-medium tabular-nums">{formatPrice(order.totalCents)}</Td>
                  <Td>
                    <StatusBadge status={order.status} />
                  </Td>
                  <Td className="text-sm text-muted-foreground">
                    {relativeDate(order.createdAt)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>

          <Pagination page={page} pageCount={pageCount} total={total} />
        </>
      )}
    </>
  );
}
