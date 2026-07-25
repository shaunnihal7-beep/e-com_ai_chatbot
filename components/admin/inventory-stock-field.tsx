"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateStockAction } from "@/app/actions/admin/products";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** In-place stock editor used across the inventory table. Saves on blur. */
export function InventoryStockField({ sizeId, stock }: { sizeId: number; stock: number }) {
  const router = useRouter();
  const [value, setValue] = useState(String(stock));
  const [saving, setSaving] = useState(false);

  useEffect(() => setValue(String(stock)), [stock]);

  const commit = async () => {
    if (Number(value) === stock) return;
    setSaving(true);
    const result = await updateStockAction(sizeId, Number(value));
    setSaving(false);
    if (result.ok) router.refresh();
    else toast.error(result.message);
  };

  return (
    <Input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      inputMode="numeric"
      aria-label="Stock quantity"
      className={cn(
        "h-8 w-20 tabular-nums",
        Number(value) === 0 && "text-destructive",
        saving && "opacity-60",
      )}
    />
  );
}
