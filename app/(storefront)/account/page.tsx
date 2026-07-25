import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ArrowUpRight, Heart, Package } from "lucide-react";

import { getSession } from "@/lib/auth";
import { getOrdersForUser } from "@/lib/queries/orders";
import { formatDate, formatPrice } from "@/lib/format";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Reveal, SplitWords } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Account",
  description: "Your Veloce account.",
};

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/account/login?redirectTo=/account");

  const orders = await getOrdersForUser(session.id);
  const recent = orders.slice(0, 2);

  return (
    <div className="container-page pb-24 pt-24 md:pt-32">
      <header className="flex flex-wrap items-end justify-between gap-6 pb-12">
        <div>
          <p className="text-eyebrow text-brand">Account</p>
          <h1 className="mt-4 text-display-lg">
            <SplitWords text={session.name} />
          </h1>
          <p className="mt-4 text-muted-foreground">{session.email}</p>
        </div>

        <form action={logoutAction}>
          <Button type="submit" variant="outline" className="h-11 rounded-full px-6">
            Sign out
          </Button>
        </form>
      </header>

      {/* Quick links */}
      <Reveal>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              href: "/account/orders",
              icon: Package,
              title: "My Orders",
              body: `${orders.length} ${orders.length === 1 ? "order" : "orders"} placed`,
            },
            {
              href: "/wishlist",
              icon: Heart,
              title: "Wishlist",
              body: "Everything you have saved",
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-4 rounded-xl border border-border p-6 transition-colors hover:border-foreground/40"
            >
              <item.icon className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-bold tracking-tight">
                  {item.title}
                </p>
                <p className="text-sm text-muted-foreground">{item.body}</p>
              </div>
              <ArrowUpRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          ))}
        </div>
      </Reveal>

      {/* Recent orders */}
      {recent.length > 0 && (
        <section className="mt-16">
          <div className="flex items-end justify-between gap-6">
            <h2 className="text-display-md">Recent orders</h2>
            <Link href="/account/orders" className="link-sweep shrink-0 text-sm">
              View all
            </Link>
          </div>

          <div className="mt-8 space-y-3">
            {recent.map((order, i) => (
              <Reveal key={order.id} delay={i * 0.07}>
                <Link
                  href={`/account/orders/${order.orderNumber}`}
                  className="group flex flex-wrap items-center gap-5 rounded-xl border border-border p-4 transition-colors hover:border-foreground/40"
                >
                  <div className="flex -space-x-3">
                    {order.items.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="relative size-14 overflow-hidden rounded-lg bg-surface ring-2 ring-background"
                      >
                        <Image
                          src={item.imageSnapshot}
                          alt={item.nameSnapshot}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-bold">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(order.createdAt)} · {order.items.length}{" "}
                      {order.items.length === 1 ? "item" : "items"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-medium tabular-nums">
                      {formatPrice(order.totalCents)}
                    </p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {order.status}
                    </p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
