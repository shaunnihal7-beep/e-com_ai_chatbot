import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { formatPrice, formatSize } from "@/lib/format";
import { getOrderDetail } from "@/lib/admin/queries/orders";
import { OrderStatusSelect } from "@/components/admin/order-status-select";
import { PageHeader, Panel, StatusBadge } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const order = await getOrderDetail(Number(id));
  return { title: order ? order.orderNumber : "Order" };
}

type Address = {
  name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  postcode?: string;
  country?: string;
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();

  const order = await getOrderDetail(orderId);
  if (!order) notFound();

  const address = (order.shippingAddress ?? {}) as Address;

  return (
    <>
      <Link
        href="/admin/orders"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to orders
      </Link>

      <PageHeader
        title={order.orderNumber}
        description={`Placed ${new Date(order.createdAt).toLocaleString("en-US", {
          dateStyle: "long",
          timeStyle: "short",
        })}`}
      >
        <StatusBadge status={order.status} />
        <OrderStatusSelect orderId={order.id} status={order.status} />
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Items" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 p-4">
                  {item.imageSnapshot ? (
                    <Image
                      src={item.imageSnapshot}
                      alt=""
                      width={48}
                      height={60}
                      className="size-12 shrink-0 rounded-md object-cover"
                    />
                  ) : null}

                  <div className="min-w-0 flex-1">
                    {item.productId ? (
                      <Link
                        href={`/admin/products/${item.productId}`}
                        className="font-medium hover:underline"
                      >
                        {item.nameSnapshot}
                      </Link>
                    ) : (
                      <span className="font-medium">{item.nameSnapshot}</span>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {item.colorSnapshot} · US {formatSize(item.size)} · Qty {item.quantity}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium tabular-nums">
                      {formatPrice(item.unitPriceCents * item.quantity)}
                    </p>
                    {item.quantity > 1 ? (
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {formatPrice(item.unitPriceCents)} each
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>

            <dl className="space-y-1.5 border-t border-border p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">{formatPrice(order.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd className="tabular-nums">
                  {order.shippingCents ? formatPrice(order.shippingCents) : "Free"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tax</dt>
                <dd className="tabular-nums">{formatPrice(order.taxCents)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatPrice(order.totalCents)}</dd>
              </div>
            </dl>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Customer">
            <div className="space-y-2 text-sm">
              <p className="font-medium">{order.customer?.name ?? "Guest checkout"}</p>
              <p className="break-all text-muted-foreground">{order.email}</p>

              <div className="border-t border-border pt-2">
                <p className="text-xs text-muted-foreground">
                  {order.lifetimeOrders} lifetime order{order.lifetimeOrders === 1 ? "" : "s"} ·{" "}
                  {formatPrice(order.lifetimeSpendCents)} spent
                </p>
              </div>
            </div>
          </Panel>

          <Panel title="Shipping address">
            <address className="text-sm not-italic leading-relaxed">
              {address.name ? <p>{address.name}</p> : null}
              {address.line1 ? <p>{address.line1}</p> : null}
              {address.line2 ? <p>{address.line2}</p> : null}
              <p>
                {[address.city, address.postcode].filter(Boolean).join(", ")}
              </p>
              {address.country ? <p>{address.country}</p> : null}
              {!address.line1 ? (
                <p className="text-muted-foreground">No address on file.</p>
              ) : null}
            </address>
          </Panel>
        </div>
      </div>
    </>
  );
}
