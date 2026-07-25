"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Star } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RatingStars } from "./rating-stars";
import { addReviewAction } from "@/app/actions/reviews";
import type { ProductDetail } from "@/lib/types";

const EASE = [0.16, 1, 0.3, 1] as const;

export function ProductReviews({ product }: { product: ProductDetail }) {
  const [visible, setVisible] = useState(4);
  const reviews = product.reviews;

  return (
    <section id="reviews" className="scroll-mt-28 border-t border-border">
      <div className="container-page section-y">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-20">
          {/* Summary */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-eyebrow text-muted-foreground">Reviews</p>
            <h2 className="mt-4 text-display-md">
              {product.rating.toFixed(1)}
              <span className="text-muted-foreground">/5</span>
            </h2>

            <div className="mt-3 flex items-center gap-2.5">
              <RatingStars rating={product.rating} size={16} />
              <span className="text-sm text-muted-foreground">
                {product.reviewCount} {product.reviewCount === 1 ? "review" : "reviews"}
              </span>
            </div>

            {/* Histogram */}
            <div className="mt-7 space-y-2">
              {([5, 4, 3, 2, 1] as const).map((star) => {
                const count = product.ratingBreakdown[star];
                const pct = product.reviewCount
                  ? (count / product.reviewCount) * 100
                  : 0;
                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="flex w-8 shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground">
                      {star}
                      <Star className="size-3 fill-current" strokeWidth={0} />
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        className="h-full rounded-full bg-foreground"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${pct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, ease: EASE }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>

            <WriteReviewDialog productId={product.id} productName={product.name} />
          </div>

          {/* List */}
          <div>
            {reviews.length === 0 ? (
              <p className="text-muted-foreground">
                No reviews yet. Be the first to say something.
              </p>
            ) : (
              <>
                <ul className="divide-y divide-border">
                  {reviews.slice(0, visible).map((review, i) => (
                    <motion.li
                      key={review.id}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.5, delay: Math.min(i, 4) * 0.06, ease: EASE }}
                      className="py-7 first:pt-0"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <RatingStars rating={review.rating} size={14} />
                        <time className="text-xs text-muted-foreground">
                          {formatDate(review.createdAt)}
                        </time>
                      </div>

                      <h3 className="mt-3 font-display text-lg font-semibold tracking-tight">
                        {review.title}
                      </h3>
                      <p className="mt-2 leading-relaxed text-muted-foreground">
                        {review.body}
                      </p>

                      {review.images.length > 0 && (
                        <ul className="mt-3.5 flex flex-wrap gap-2">
                          {review.images.map((url) => (
                            <li key={url}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt={`Customer photo for ${review.title}`}
                                className="size-20 rounded-lg object-cover"
                                loading="lazy"
                              />
                            </li>
                          ))}
                        </ul>
                      )}

                      <p className="mt-3.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{review.author}</span>
                        {review.verified && (
                          <span className="rounded-full bg-muted px-2 py-0.5">
                            Verified purchase
                          </span>
                        )}
                      </p>

                      {review.reply && (
                        <div className="mt-4 rounded-lg border-l-2 border-brand bg-muted/50 px-4 py-3">
                          <p className="text-xs font-medium">
                            {review.replyAuthor ?? "Veloce"} responded
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            {review.reply}
                          </p>
                        </div>
                      )}
                    </motion.li>
                  ))}
                </ul>

                {visible < reviews.length && (
                  <Button
                    variant="outline"
                    className="mt-8 h-12 rounded-full px-8"
                    onClick={() => setVisible((v) => v + 6)}
                  >
                    Load more reviews
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function WriteReviewDialog({
  productId,
  productName,
}: {
  productId: number;
  productName: string;
}) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);

    const result = await addReviewAction({
      productId,
      rating,
      author: String(data.get("author") ?? ""),
      title: String(data.get("title") ?? ""),
      body: String(data.get("body") ?? ""),
    });

    setPending(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setOpen(false);
    toast.success(result.message);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline" className="mt-8 h-12 w-full rounded-full" />}
      >
        Write a review
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold tracking-tight">
            Review the {productName}
          </DialogTitle>
          <DialogDescription>
            Tell other people what you would have wanted to know before buying.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <span className="text-eyebrow text-muted-foreground">Rating</span>
            <div className="mt-2.5 flex gap-1" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHover(star)}
                  aria-label={`${star} star${star > 1 ? "s" : ""}`}
                  className="p-1"
                >
                  <Star
                    className={cn(
                      "size-6 transition-colors",
                      (hover || rating) >= star
                        ? "fill-foreground text-foreground"
                        : "text-muted-foreground/40",
                    )}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="author" className="text-eyebrow text-muted-foreground">
                Your name
              </label>
              <Input id="author" name="author" required className="mt-2 h-12" />
            </div>
            <div>
              <label htmlFor="title" className="text-eyebrow text-muted-foreground">
                Headline
              </label>
              <Input id="title" name="title" required className="mt-2 h-12" />
            </div>
          </div>

          <div>
            <label htmlFor="body" className="text-eyebrow text-muted-foreground">
              Your review
            </label>
            <Textarea id="body" name="body" required rows={5} className="mt-2 resize-none" />
          </div>

          <Button type="submit" disabled={pending} className="h-12 w-full rounded-full">
            {pending ? "Posting…" : "Post review"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
