import type { Metadata } from "next";

import { getSession } from "@/lib/auth";
import { CheckoutClient } from "@/components/checkout/checkout-client";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your Veloce order.",
  robots: { index: false },
};

export default async function CheckoutPage() {
  const session = await getSession();

  return (
    <CheckoutClient
      defaultName={session?.name ?? ""}
      defaultEmail={session?.email ?? ""}
    />
  );
}
