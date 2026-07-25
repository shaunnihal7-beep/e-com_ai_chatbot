"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateOrderStatusAction } from "@/app/actions/admin/orders";
import { ORDER_STATUSES } from "@/lib/admin/constants";

/** Inline status changer for an order — saves immediately on selection. */
export function OrderStatusSelect({
  orderId,
  status,
}: {
  orderId: number;
  status: string;
}) {
  const [value, setValue] = useState(status);
  const [pending, startTransition] = useTransition();

  const change = (next: string) => {
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const result = await updateOrderStatusAction(orderId, next);
      if (result.ok) toast.success(result.message);
      else {
        setValue(previous); // Roll the control back if the write was rejected.
        toast.error(result.message);
      }
    });
  };

  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => change(e.target.value)}
      aria-label="Order status"
      className="h-9 rounded-lg border border-input bg-background px-2 text-sm capitalize outline-none focus-visible:border-ring disabled:opacity-60"
    >
      {ORDER_STATUSES.map((s) => (
        <option key={s} value={s} className="capitalize">
          {s}
        </option>
      ))}
    </select>
  );
}
