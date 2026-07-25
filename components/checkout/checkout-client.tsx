"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Lock, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { formatPrice, formatSize } from "@/lib/format";
import { cartSubtotal, shippingFor, taxFor, useCart } from "@/lib/stores/cart";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { placeOrderAction } from "@/app/actions/checkout";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SplitWords } from "@/components/motion/reveal";

const EASE = [0.16, 1, 0.3, 1] as const;

export function CheckoutClient({
  defaultName,
  defaultEmail,
}: {
  defaultName: string;
  defaultEmail: string;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const lines = useCart((s) => s.lines);
  const [pending, setPending] = useState(false);

  const subtotal = cartSubtotal(lines);
  const shipping = shippingFor(subtotal);
  const tax = taxFor(subtotal);
  const total = subtotal + shipping + tax;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const data = new FormData(event.currentTarget);
    setPending(true);

    const result = await placeOrderAction(
      {
        name: String(data.get("name") ?? ""),
        email: String(data.get("email") ?? ""),
        line1: String(data.get("line1") ?? ""),
        line2: String(data.get("line2") ?? ""),
        city: String(data.get("city") ?? ""),
        postcode: String(data.get("postcode") ?? ""),
        country: String(data.get("country") ?? ""),
      },
      lines,
    );

    if (!result.ok) {
      setPending(false);
      toast.error(result.message);
      return;
    }

    // The cart is cleared on the confirmation page, not here — so a failed
    // navigation never loses the customer's basket.
    router.push(`/order/${result.orderNumber}`);
  }

  if (!hydrated) {
    return (
      <div className="container-page pb-24 pt-24 md:pt-32">
        <Skeleton className="h-14 w-64" />
        <Skeleton className="mt-12 h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="container-page flex min-h-[70dvh] flex-col items-center justify-center py-24 text-center">
        <ShoppingBag className="size-8 text-muted-foreground" strokeWidth={1.2} />
        <h1 className="mt-6 text-display-md">Nothing to check out</h1>
        <p className="mt-4 max-w-md text-muted-foreground">
          Your cart is empty. Add something first.
        </p>
        <ButtonLink className="mt-8 h-12 rounded-full px-8" href="/shop">
          Shop the range
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="container-page pb-24 pt-24 md:pt-32">
      <header className="pb-12">
        <p className="text-eyebrow text-brand">Almost there</p>
        <h1 className="mt-4 text-display-lg">
          <SplitWords text="Checkout" />
        </h1>
      </header>

      <form
        onSubmit={onSubmit}
        className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-16"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="space-y-10"
        >
          {/* Contact */}
          <section>
            <h2 className="font-display text-xl font-bold tracking-tight">Contact</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field
                id="name"
                label="Full name"
                defaultValue={defaultName}
                autoComplete="name"
                required
              />
              <Field
                id="email"
                label="Email"
                type="email"
                defaultValue={defaultEmail}
                autoComplete="email"
                required
              />
            </div>
          </section>

          {/* Delivery */}
          <section>
            <h2 className="font-display text-xl font-bold tracking-tight">
              Delivery address
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field id="line1" label="Address" autoComplete="address-line1" required />
              </div>
              <div className="sm:col-span-2">
                <Field
                  id="line2"
                  label="Apartment, suite (optional)"
                  autoComplete="address-line2"
                />
              </div>
              <Field id="city" label="City" autoComplete="address-level2" required />
              <Field id="postcode" label="Postcode" autoComplete="postal-code" required />
              <div className="sm:col-span-2">
                <Field
                  id="country"
                  label="Country"
                  defaultValue="United Kingdom"
                  autoComplete="country-name"
                  required
                />
              </div>
            </div>
          </section>

          {/* Payment */}
          <section>
            <h2 className="font-display text-xl font-bold tracking-tight">Payment</h2>
            <div className="mt-5 rounded-xl border border-dashed border-border p-6">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Lock className="size-4" strokeWidth={1.8} />
                Demo store — no payment is taken
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                This is a demonstration build. Placing the order writes a real row to
                the database and takes you to a real confirmation page, but no card
                details are collected and nothing is charged.
              </p>
            </div>
          </section>
        </motion.div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
          className="lg:sticky lg:top-28 lg:self-start"
        >
          <div className="rounded-xl border border-border p-6">
            <h2 className="font-display text-lg font-bold tracking-tight">
              Your order
            </h2>

            <ul className="mt-5 space-y-4">
              {lines.map((line) => (
                <li
                  key={`${line.productId}-${line.colorSlug}-${line.size}`}
                  className="flex items-center gap-3"
                >
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface">
                    <Image
                      src={line.image}
                      alt={line.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                    <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-foreground text-[10px] font-bold text-background">
                      {line.quantity}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{line.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {line.colorName} · US {formatSize(line.size)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm tabular-nums">
                    {formatPrice(line.unitPriceCents * line.quantity)}
                  </p>
                </li>
              ))}
            </ul>

            <dl className="mt-6 space-y-2.5 border-t border-border pt-5 text-sm">
              <Row label="Subtotal" value={formatPrice(subtotal)} />
              <Row
                label="Delivery"
                value={shipping === 0 ? "Free" : formatPrice(shipping)}
              />
              <Row label="Estimated tax" value={formatPrice(tax)} />
              <div className="flex items-baseline justify-between border-t border-border pt-3">
                <dt className="font-medium">Total</dt>
                <dd className="font-display text-xl font-bold tabular-nums">
                  {formatPrice(total)}
                </dd>
              </div>
            </dl>

            <Button
              type="submit"
              disabled={pending}
              className="mt-6 h-13 w-full rounded-full text-sm font-semibold"
            >
              {pending ? "Placing order…" : `Place order · ${formatPrice(total)}`}
            </Button>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Free returns within 60 days
            </p>
          </div>
        </motion.div>
      </form>
    </div>
  );
}

function Field({
  id,
  label,
  ...props
}: React.ComponentProps<typeof Input> & { id: string; label: string }) {
  return (
    <div>
      <label htmlFor={id} className="text-eyebrow text-muted-foreground">
        {label}
      </label>
      <Input id={id} name={id} className="mt-2 h-12" {...props} />
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
