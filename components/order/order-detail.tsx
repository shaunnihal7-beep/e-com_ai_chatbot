import Link from "next/link";
import Image from "next/image";

import { formatDate, formatPrice, formatSize } from "@/lib/format";
import type { OrderView, ShippingAddress } from "@/lib/queries/orders";
import { Reveal } from "@/components/motion/reveal";

const STEPS = ["confirmed", "shipped", "delivered"] as const;

/** Shared by the order confirmation page and the account order detail page. */
export function OrderDetail({ order }: { order: OrderView }) {
  const address = order.shippingAddress as ShippingAddress;
  const currentStep = Math.max(0, STEPS.indexOf(order.status as (typeof STEPS)[number]));

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-16">
      <div>
        {/* Progress */}
        <Reveal>
          <div className="rounded-xl border border-border p-6">
            <div className="flex items-center justify-between gap-2">
              {STEPS.map((step, i) => (
                <div key={step} className="flex flex-1 items-center gap-2 last:flex-none">
                  <div className="flex flex-col items-center gap-2">
                    <span
                      className={`grid size-7 place-items-center rounded-full text-[11px] font-bold ${
                        i <= currentStep
                          ? "bg-foreground text-background"
                          : "border border-border text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={`text-[11px] capitalize ${
                        i <= currentStep ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {step}
                    </span>
                  </div>

                  {i < STEPS.length - 1 && (
                    <span
                      className={`mb-5 h-px flex-1 ${
                        i < currentStep ? "bg-foreground" : "bg-border"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Items */}
        <Reveal delay={0.08}>
          <ul className="mt-4 divide-y divide-border rounded-xl border border-border">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 p-5">
                <Link
                  href={`/product/${item.slugSnapshot}`}
                  className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-surface"
                >
                  <Image
                    src={item.imageSnapshot}
                    alt={item.nameSnapshot}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </Link>

                <div className="min-w-0 flex-1">
                  <Link href={`/product/${item.slugSnapshot}`}>
                    <p className="truncate font-display text-sm font-bold">
                      {item.nameSnapshot}
                    </p>
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.colorSnapshot} · US {formatSize(item.size)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Quantity {item.quantity}
                  </p>
                </div>

                <p className="shrink-0 text-sm font-medium tabular-nums">
                  {formatPrice(item.unitPriceCents * item.quantity)}
                </p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>

      {/* Summary */}
      <Reveal delay={0.12}>
        <div className="lg:sticky lg:top-28">
          <div className="rounded-xl border border-border p-6">
            <h2 className="font-display text-lg font-bold tracking-tight">Summary</h2>

            <dl className="mt-5 space-y-2.5 text-sm">
              <Row label="Subtotal" value={formatPrice(order.subtotalCents)} />
              <Row
                label="Delivery"
                value={
                  order.shippingCents === 0 ? "Free" : formatPrice(order.shippingCents)
                }
              />
              <Row label="Tax" value={formatPrice(order.taxCents)} />
              <div className="flex items-baseline justify-between border-t border-border pt-3">
                <dt className="font-medium">Total</dt>
                <dd className="font-display text-lg font-bold tabular-nums">
                  {formatPrice(order.totalCents)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-4 rounded-xl border border-border p-6">
            <h2 className="font-display text-lg font-bold tracking-tight">Delivery to</h2>
            <address className="mt-4 space-y-0.5 text-sm not-italic text-muted-foreground">
              <p className="font-medium text-foreground">{address.name}</p>
              <p>{address.line1}</p>
              {address.line2 && <p>{address.line2}</p>}
              <p>{address.city}</p>
              <p>{address.postcode}</p>
              <p>{address.country}</p>
            </address>

            <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
              Order placed {formatDate(order.createdAt)} · Confirmation sent to{" "}
              {order.email}
            </p>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
