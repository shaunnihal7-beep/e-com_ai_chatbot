import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatPrice, formatDate } from "@/lib/format";
import { getCustomerProfile } from "@/lib/admin/queries/customers";
import {
  EmptyState,
  PageHeader,
  Panel,
  StatCard,
  StatusBadge,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";

export const metadata: Metadata = { title: "Customer" };
export const dynamic = "force-dynamic";

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ email: string }>;
}) {
  const { email } = await params;
  const profile = await getCustomerProfile(decodeURIComponent(email));

  if (!profile) notFound();

  const { user, orderCount, spendCents, lastOrderAt, productsBought, recentOrders } = profile;
  const avgOrderCents = orderCount ? Math.round(spendCents / orderCount) : 0;

  return (
    <>
      <PageHeader title={user.name} description={user.email}>
        <Link
          href="/admin/customers"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← All customers
        </Link>
        {process.env.HUBSPOT_PORTAL_ID ? (
          <a
            href={`https://app.hubspot.com/contacts/${process.env.HUBSPOT_PORTAL_ID}/objects/0-1/views/all/list?query=${encodeURIComponent(user.email)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#ff7a59] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ff8f73]"
          >
            Open in HubSpot ↗
          </a>
        ) : null}
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Orders" value={String(orderCount)} />
        <StatCard label="Lifetime spend" value={formatPrice(spendCents)} />
        <StatCard label="Avg order value" value={formatPrice(avgOrderCents)} />
        <StatCard
          label="Last order"
          value={lastOrderAt ? formatDate(lastOrderAt) : "—"}
          hint={`Joined ${formatDate(user.createdAt)}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Products bought" description="Every item across all orders.">
          {productsBought.length === 0 ? (
            <EmptyState title="No products yet" description="This customer hasn't purchased anything." />
          ) : (
            <ul className="divide-y divide-border">
              {productsBought.map((p) => (
                <li key={p.slug} className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    ×{p.units}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Order history" description="Most recent first.">
          {recentOrders.length === 0 ? (
            <EmptyState title="No orders yet" />
          ) : (
            <TableShell>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Status</Th>
                  <Th>Date</Th>
                  <Th>Total</Th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/50">
                    <Td>
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {o.orderNumber}
                      </Link>
                    </Td>
                    <Td>
                      <StatusBadge status={o.status} />
                    </Td>
                    <Td className="text-sm text-muted-foreground">{formatDate(o.createdAt)}</Td>
                    <Td className="font-medium tabular-nums">{formatPrice(o.totalCents)}</Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </Panel>
      </div>
    </>
  );
}
