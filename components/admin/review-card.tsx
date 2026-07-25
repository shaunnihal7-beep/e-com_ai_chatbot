"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, MessageSquare, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import {
  deleteReplyAction,
  deleteReviewAction,
  moderateReviewAction,
  removeReviewImageAction,
  replyToReviewAction,
  type ReplyState,
} from "@/app/actions/admin/reviews";
import { ActionButton } from "@/components/admin/action-button";
import { StatusBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const initialReply: ReplyState = { ok: false, message: "" };

export type ReviewCardData = {
  id: number;
  productId: number;
  productName: string | null;
  productSlug: string | null;
  author: string;
  email: string | null;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  status: string;
  images: string[];
  reply: string | null;
  replyAuthor: string | null;
  repliedAt: Date | null;
  createdAt: Date;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "size-3.5",
            n <= rating ? "fill-brand text-brand" : "fill-none text-muted-foreground/40",
          )}
          aria-hidden
        />
      ))}
    </span>
  );
}

export function ReviewCard({ review }: { review: ReviewCardData }) {
  const router = useRouter();
  const [replyOpen, setReplyOpen] = useState(false);
  const [state, formAction, pending] = useActionState(replyToReviewAction, initialReply);

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) {
      toast.success(state.message);
      setReplyOpen(false);
      router.refresh();
    } else {
      toast.error(state.message);
    }
  }, [state, router]);

  return (
    <article className="rounded-xl border border-border bg-background p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Stars rating={review.rating} />
            <StatusBadge status={review.status} />
            {review.verified ? (
              <span className="text-xs text-success">Verified buyer</span>
            ) : null}
          </div>

          <p className="mt-1.5 font-medium">{review.title}</p>
          <p className="text-xs text-muted-foreground">
            {review.author}
            {review.email ? ` · ${review.email}` : ""} ·{" "}
            {new Date(review.createdAt).toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            {review.productSlug ? (
              <>
                {" · "}
                <Link
                  href={`/admin/products/${review.productId}`}
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  {review.productName}
                </Link>
              </>
            ) : null}
          </p>
        </div>
      </header>

      <p className="mt-3 text-sm whitespace-pre-line">{review.body}</p>

      {review.images.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {review.images.map((url) => (
            <li key={url} className="relative">
              <Image
                src={url}
                alt={`Customer photo for ${review.title}`}
                width={72}
                height={72}
                className="size-18 rounded-md object-cover"
              />
              <ActionButton
                action={() => removeReviewImageAction(review.id, url)}
                size="icon-xs"
                variant="destructive"
                title="Remove photo"
                className="absolute -top-1.5 -right-1.5 rounded-full"
              >
                <X className="size-3" aria-hidden />
              </ActionButton>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Store reply */}
      {review.reply ? (
        <div className="mt-3 rounded-lg border border-border bg-muted/50 p-3">
          <p className="text-xs font-medium">
            {review.replyAuthor ?? "Veloce"} replied
          </p>
          <p className="mt-1 text-sm whitespace-pre-line">{review.reply}</p>
          <ActionButton
            action={() => deleteReplyAction(review.id)}
            size="xs"
            variant="ghost"
            className="mt-1.5"
          >
            Remove reply
          </ActionButton>
        </div>
      ) : replyOpen ? (
        <form action={formAction} className="mt-3 space-y-2">
          <input type="hidden" name="id" value={review.id} />
          <Textarea
            name="reply"
            rows={3}
            required
            placeholder="Write a public reply…"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Publishing…" : "Publish reply"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setReplyOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {/* Moderation controls */}
      <footer className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
        {review.status !== "approved" ? (
          <ActionButton
            action={() => moderateReviewAction(review.id, "approved")}
            size="sm"
            variant="outline"
          >
            <Check className="size-3.5" aria-hidden />
            Approve
          </ActionButton>
        ) : null}

        {review.status !== "rejected" ? (
          <ActionButton
            action={() => moderateReviewAction(review.id, "rejected")}
            size="sm"
            variant="outline"
          >
            <X className="size-3.5" aria-hidden />
            Reject
          </ActionButton>
        ) : null}

        {review.status !== "pending" ? (
          <ActionButton
            action={() => moderateReviewAction(review.id, "pending")}
            size="sm"
            variant="ghost"
          >
            Move to pending
          </ActionButton>
        ) : null}

        {!review.reply && !replyOpen ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setReplyOpen(true)}
          >
            <MessageSquare className="size-3.5" aria-hidden />
            Reply
          </Button>
        ) : null}

        <ActionButton
          action={() => deleteReviewAction(review.id)}
          size="sm"
          variant="destructive"
          confirm="Delete review"
          className="ml-auto"
        >
          <Trash2 className="size-3.5" aria-hidden />
          Delete
        </ActionButton>
      </footer>
    </article>
  );
}
