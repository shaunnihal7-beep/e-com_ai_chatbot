"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";

import { useCart } from "@/lib/stores/cart";
import { SplitWords } from "@/components/motion/reveal";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Confirmation banner. Also the point where the cart is emptied — doing it
 * here rather than in the checkout action means the cart survives a failed
 * payment and only clears once the customer actually sees the receipt.
 */
export function OrderConfirmationHeader({
  orderNumber,
  email,
}: {
  orderNumber: string;
  email: string;
}) {
  const clear = useCart((s) => s.clear);

  useEffect(() => {
    clear();
  }, [clear]);

  return (
    <header>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.15 }}
        className="grid size-14 place-items-center rounded-full bg-success text-white"
      >
        <motion.span
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Check className="size-6" strokeWidth={2.5} />
        </motion.span>
      </motion.div>

      <p className="text-eyebrow mt-7 text-brand">Order confirmed</p>

      <h1 className="mt-4 max-w-[16ch] text-display-lg">
        <SplitWords text="Thank you. It's on its way." delay={0.2} />
      </h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.6, ease: EASE }}
        className="mt-6 max-w-lg text-body-lg text-muted-foreground"
      >
        Order <span className="font-medium text-foreground">{orderNumber}</span> is
        confirmed. We&apos;ve sent the details to{" "}
        <span className="font-medium text-foreground">{email}</span>, and you&apos;ll get
        tracking as soon as it ships.
      </motion.p>
    </header>
  );
}
