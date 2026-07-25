"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { products, reviews, type ReviewStatus } from "@/db/schema";
import { logActivity } from "@/lib/admin/activity";
import { requireAdminAction } from "@/lib/admin/auth";

async function revalidateReview(reviewId: number) {
  const [row] = await db
    .select({ slug: products.slug })
    .from(reviews)
    .innerJoin(products, eq(reviews.productId, products.id))
    .where(eq(reviews.id, reviewId))
    .limit(1);

  revalidatePath("/admin/reviews");
  revalidatePath("/admin");
  if (row?.slug) revalidatePath(`/product/${row.slug}`);
}

export async function moderateReviewAction(id: number, status: ReviewStatus) {
  const admin = await requireAdminAction();

  const review = await db.query.reviews.findFirst({ where: eq(reviews.id, id) });
  if (!review) return { ok: false, message: "That review no longer exists." };

  await revalidateReview(id);

  await db
    .update(reviews)
    .set({ status, moderatedAt: new Date() })
    .where(eq(reviews.id, id));

  const verb = status === "approved" ? "approved" : status === "rejected" ? "rejected" : "updated";
  await logActivity(
    admin,
    verb,
    "review",
    `${verb} a ${review.rating}-star review by ${review.author}`,
    id,
  );

  await revalidateReview(id);
  return { ok: true, message: `Review ${status}.` };
}

const replySchema = z.object({
  id: z.coerce.number().int().positive(),
  reply: z.string().trim().min(2, "Write a reply.").max(2000),
});

export type ReplyState = { ok: boolean; message: string };

export async function replyToReviewAction(
  _prev: ReplyState,
  formData: FormData,
): Promise<ReplyState> {
  const admin = await requireAdminAction();

  const parsed = replySchema.safeParse({
    id: formData.get("id"),
    reply: formData.get("reply"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check your reply." };
  }

  const review = await db.query.reviews.findFirst({
    where: eq(reviews.id, parsed.data.id),
  });
  if (!review) return { ok: false, message: "That review no longer exists." };

  await db
    .update(reviews)
    .set({
      reply: parsed.data.reply,
      replyAuthor: admin.name,
      repliedAt: new Date(),
    })
    .where(eq(reviews.id, parsed.data.id));

  await logActivity(admin, "replied", "review", `Replied to ${review.author}'s review`, review.id);
  await revalidateReview(review.id);

  return { ok: true, message: "Reply published." };
}

export async function deleteReplyAction(id: number) {
  await requireAdminAction();

  await db
    .update(reviews)
    .set({ reply: null, replyAuthor: null, repliedAt: null })
    .where(eq(reviews.id, id));

  await revalidateReview(id);
  return { ok: true, message: "Reply removed." };
}

export async function deleteReviewAction(id: number) {
  const admin = await requireAdminAction();

  const review = await db.query.reviews.findFirst({ where: eq(reviews.id, id) });
  if (!review) return { ok: false, message: "That review no longer exists." };

  // Resolve the product slug before the row disappears.
  await revalidateReview(id);
  await db.delete(reviews).where(eq(reviews.id, id));

  await logActivity(admin, "deleted", "review", `Deleted a review by ${review.author}`, id);
  revalidatePath("/admin/reviews");

  return { ok: true, message: "Review deleted." };
}

export async function bulkModerateAction(ids: number[], status: ReviewStatus) {
  const admin = await requireAdminAction();
  if (!ids.length) return { ok: false, message: "Nothing selected." };

  await db
    .update(reviews)
    .set({ status, moderatedAt: new Date() })
    .where(sql`${reviews.id} = any(${ids})`);

  await logActivity(admin, status === "approved" ? "approved" : "rejected", "review", `${status} ${ids.length} reviews`);

  revalidatePath("/admin/reviews");
  revalidatePath("/admin");
  // A bulk change can touch many products at once; refresh the whole PDP tree.
  revalidatePath("/product", "layout");

  return { ok: true, message: `${ids.length} review${ids.length === 1 ? "" : "s"} ${status}.` };
}

/** Manages the customer photos attached to a review. */
export async function removeReviewImageAction(id: number, url: string) {
  await requireAdminAction();

  const review = await db.query.reviews.findFirst({ where: eq(reviews.id, id) });
  if (!review) return { ok: false, message: "That review no longer exists." };

  await db
    .update(reviews)
    .set({ images: review.images.filter((image) => image !== url) })
    .where(eq(reviews.id, id));

  await revalidateReview(id);
  return { ok: true, message: "Photo removed." };
}
