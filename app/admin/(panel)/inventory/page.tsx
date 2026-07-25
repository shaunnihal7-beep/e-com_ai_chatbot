import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";

import { formatSize } from "@/lib/format";
import { getInventoryTotals, getStockAlerts } from "@/lib/admin/queries/dashboard";
import { InventoryStockField } from "@/components/admin/inventory-stock-field";
import {
  EmptyState,
  PageHeader,
  StatCard,
  StockBadge,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";

export const metadata: Metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

export default async function AdminInventoryPage() {
  const [alerts, totals] = await Promise.all([
    getStockAlerts(200),
    getInventoryTotals(),
  ]);

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Sizes at or below their low-stock threshold. Edit a number to restock."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Units in stock" value={String(totals.totalUnits)} />
        <StatCard label="Low stock sizes" value={String(totals.low)} hint="need restocking" />
        <StatCard label="Out of stock" value={String(totals.outOfStock)} hint="sizes unavailable" />
        <StatCard label="Needs attention" value={String(alerts.length)} hint="alerts below" />
      </div>

      {alerts.length === 0 ? (
        <EmptyState
          title="Stock is healthy"
          description="No sizes are running low. New alerts will show up here automatically."
        />
      ) : (
        <>
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-brand/30 bg-brand-muted px-3 py-2 text-sm">
            <AlertTriangle className="size-4 shrink-0 text-brand" aria-hidden />
            <span>
              {alerts.length} size{alerts.length === 1 ? "" : "s"} need attention — restock by
              typing a new quantity.
            </span>
          </div>

          <TableShell>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>Colourway</Th>
                <Th>Size</Th>
                <Th>Level</Th>
                <Th>Set stock</Th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr
                  key={`${alert.productId}-${alert.colorName}-${alert.size}`}
                  className="hover:bg-muted/50"
                >
                  <Td>
                    <Link
                      href={`/admin/products/${alert.productId}`}
                      className="font-medium hover:underline"
                    >
                      {alert.productName}
                    </Link>
                    <p className="text-xs text-muted-foreground capitalize">{alert.status}</p>
                  </Td>
                  <Td className="text-sm">{alert.colorName}</Td>
                  <Td className="tabular-nums">US {formatSize(alert.size)}</Td>
                  <Td>
                    <StockBadge stock={alert.stock} threshold={alert.threshold} />
                  </Td>
                  <Td>
                    <InventoryStockField sizeId={alert.sizeId} stock={alert.stock} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </>
      )}
    </>
  );
}
