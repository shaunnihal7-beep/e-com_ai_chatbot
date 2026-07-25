import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Package } from "lucide-react";

import { getSession } from "@/lib/auth";
import { getOrdersForUser } from "@/lib/queries/orders";
import { formatDate, formatPrice, formatSize } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button-link";
import { Reveal, SplitWords } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "My Orders",
  description: "Your Veloce order history.",
};

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-muted text-foreground",
  shipped: "bg-brand-muted text-brand",
  delivered: "bg-success/15 text-success",
};

export default async function OrdersPage() {
  const session = await getSession();
  if (!session) redirect("/account/login?redirectTo=/account/orders");

  const orders = await getOrdersForUser(session.id);

  return (
    <div className="container-page pb-24 pt-24 md:pt-32">
      <header className="pb-12">
        <nav aria-label="Breadcrumb" className="mb-5">
          <Link href="/account" className="text-xs text-muted-foreground hover:text-foreground">
            Account
          </Link>
        </nav>
        <p className="text-eyebrow text-brand">History</p>
        <h1 className="mt-4 text-display-lg">
          <SplitWords text="My Orders" />
        </h1>
      </header>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Package className="size-8 text-muted-foreground" strokeWidth={1.2} />
          <h2 className="mt-6 text-display-md">No orders yet</h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            When you place an order it will appear here, with tracking and returns.
          </p>
          <ButtonLink className="mt-8 h-12 rounded-full px-8" href="/shop">
            Start shopping
          </ButtonLink>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order, i) => (
            <Reveal key={order.id} delay={Math.min(i, 5) * 0.06}>
              <article className="rounded-xl border border-border">
                <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="font-display text-lg font-bold tracking-tight">
                        {order.orderNumber}
                      </h2>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                          STATUS_STYLES[order.status] ?? "bg-muted"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Placed {formatDate(order.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="font-medium tabular-nums">
                        {formatPrice(order.totalCents)}
                      </p>
                    </div>
                    <Link
                      href={`/account/orders/${order.orderNumber}`}
                      className="text-sm underline underline-offset-4"
                    >
                      Details
                    </Link>
                  </div>
                </header>

                <ul className="divide-y divide-border">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-4 p-5">
                      <Link
                        href={`/product/${item.slugSnapshot}`}
                        className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface"
                      >
                        <Image
                          src={item.imageSnapshot}
                          alt={item.nameSnapshot}
                          fill
                          sizes="64px"
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
                          {item.colorSnapshot} · US {formatSize(item.size)} · Qty{" "}
                          {item.quantity}
                        </p>
                      </div>

                      <p className="shrink-0 text-sm tabular-nums">
                        {formatPrice(item.unitPriceCents * item.quantity)}
                      </p>
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
