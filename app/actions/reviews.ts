"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { products, reviews } from "@/db/schema";

const schema = z.object({
  productId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  author: z.string().trim().min(2, "Please enter your name.").max(60),
  title: z.string().trim().min(3, "Please add a headline.").max(120),
  body: z.string().trim().min(10, "Please write at least a sentence.").max(2000),
});

export async function addReviewAction(
  input: z.input<typeof schema>,
): Promise<{ ok: boolean; message: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid review." };
  }

  const product = await db.query.products.findFirst({
    where: eq(products.id, parsed.data.productId),
    columns: { slug: true },
  });
  if (!product) return { ok: false, message: "That product no longer exists." };

  await db.insert(reviews).values({
    productId: parsed.data.productId,
    rating: parsed.data.rating,
    author: parsed.data.author,
    title: parsed.data.title,
    body: parsed.data.body,
    // Reviews written here aren't tied to a real purchase.
    verified: false,
    // Held for moderation — an admin approves it in the CMS before it shows.
    status: "pending",
  });

  revalidatePath(`/product/${product.slug}`);
  revalidatePath("/admin/reviews");
  return { ok: true, message: "Thanks — your review has been submitted for approval." };
}
