import type { Metadata } from "next";
import Link from "next/link";

import { formatPrice } from "@/lib/format";
import { listCustomers } from "@/lib/admin/queries/customers";
import { getCustomerStats } from "@/lib/admin/queries/dashboard";
import { getGuestBuyerCount } from "@/lib/admin/queries/customers";
import { Pagination, SearchInput } from "@/components/admin/filters";
import {
  EmptyState,
  PageHeader,
  StatCard,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";

export const metadata: Metadata = { title: "Customers" };
export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  const [{ rows, total, page, pageCount }, stats, guests] = await Promise.all([
    listCustomers({ q: params.q, page: params.page ? Number(params.page) : 1 }),
    getCustomerStats(30),
    getGuestBuyerCount(),
  ]);

  return (
    <>
      <PageHeader title="Customers" description="Everyone with a Veloce account." />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total accounts" value={String(stats.total)} />
        <StatCard label="New (30 days)" value={String(stats.newInPeriod)} />
        <StatCard label="Repeat buyers" value={String(stats.repeat)} hint="more than one order" />
        <StatCard label="Guest buyers" value={String(guests)} hint="no account" />
      </div>

      <div className="mb-4 flex justify-end">
        <SearchInput placeholder="Name or email…" />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No customers found" description="Try a different search." />
      ) : (
        <>
          <TableShell>
            <thead>
              <tr>
                <Th>Customer</Th>
                <Th>Orders</Th>
                <Th>Lifetime spend</Th>
                <Th>Last order</Th>
                <Th>Joined</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((customer) => (
                <tr key={customer.id} className="hover:bg-muted/50">
                  <Td>
                    <Link
                      href={`/admin/customers/${encodeURIComponent(customer.email)}`}
                      className="block hover:underline"
                    >
                      <span className="block text-sm font-medium">{customer.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {customer.email}
                      </span>
                    </Link>
                  </Td>
                  <Td className="tabular-nums">{customer.orderCount}</Td>
                  <Td className="font-medium tabular-nums">
                    {formatPrice(customer.spendCents)}
                  </Td>
                  <Td className="text-sm text-muted-foreground">
                    {customer.lastOrderAt
                      ? new Date(customer.lastOrderAt).toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </Td>
                  <Td className="text-sm text-muted-foreground">
                    {new Date(customer.createdAt).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
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
