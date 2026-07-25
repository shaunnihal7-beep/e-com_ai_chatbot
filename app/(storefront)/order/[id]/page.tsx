import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getOrderByNumber } from "@/lib/queries/orders";
import { OrderDetail } from "@/components/order/order-detail";
import { OrderConfirmationHeader } from "@/components/order/confirmation-header";
import { ButtonLink } from "@/components/ui/button-link";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false },
};

/**
 * Post-checkout confirmation. Reachable without a session because a guest can
 * check out — the URL is the receipt.
 */
export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const order = await getOrderByNumber((await params).id);
  if (!order) notFound();

  return (
    <div className="container-page pb-24 pt-24 md:pt-32">
      <OrderConfirmationHeader
        orderNumber={order.orderNumber}
        email={order.email}
      />

      <div className="mt-14">
        <OrderDetail order={order} />
      </div>

      <div className="mt-12 flex flex-wrap gap-3">
        <ButtonLink className="h-13 rounded-full px-8 text-sm font-semibold" href="/shop">
          Continue shopping
        </ButtonLink>
        <ButtonLink
          variant="outline"
          className="h-13 rounded-full px-8 text-sm font-semibold"
          href="/account/orders"
        >
          View all orders
        </ButtonLink>
      </div>
    </div>
  );
}
