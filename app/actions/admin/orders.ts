"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { orders } from "@/db/schema";
import { logActivity } from "@/lib/admin/activity";
import { requireAdminAction } from "@/lib/admin/auth";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/admin/constants";

export async function updateOrderStatusAction(id: number, status: string) {
  const admin = await requireAdminAction();

  if (!ORDER_STATUSES.includes(status as OrderStatus)) {
    return { ok: false, message: "That isn't a valid order status." };
  }

  const existing = await db.query.orders.findFirst({ where: eq(orders.id, id) });
  if (!existing) return { ok: false, message: "That order no longer exists." };

  await db.update(orders).set({ status }).where(eq(orders.id, id));

  await logActivity(
    admin,
    "updated",
    "order",
    `Moved order ${existing.orderNumber} to ${status}`,
    id,
  );

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin");
  revalidatePath(`/order/${existing.orderNumber}`);

  return { ok: true, message: `Order marked ${status}.` };
}
