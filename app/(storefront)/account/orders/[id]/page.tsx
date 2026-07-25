import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { getOrderByNumber } from "@/lib/queries/orders";
import { OrderDetail } from "@/components/order/order-detail";
import { SplitWords } from "@/components/motion/reveal";

export const metadata: Metadata = { title: "Order" };

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/account/login?redirectTo=/account/orders/${id}`);

  const order = await getOrderByNumber(id);
  // Scope to the signed-in user so an order number isn't a public URL.
  if (!order || order.userId !== session.id) notFound();

  return (
    <div className="container-page pb-24 pt-24 md:pt-32">
      <header className="pb-12">
        <nav aria-label="Breadcrumb" className="mb-5">
          <Link
            href="/account/orders"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            My Orders
          </Link>
        </nav>

        <p className="text-eyebrow capitalize text-brand">{order.status}</p>
        <h1 className="mt-4 text-display-lg">
          <SplitWords text={order.orderNumber} />
        </h1>
      </header>

      <OrderDetail order={order} />
    </div>
  );
}
