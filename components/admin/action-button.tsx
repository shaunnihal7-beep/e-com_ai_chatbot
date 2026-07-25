"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Result = { ok: boolean; message: string; id?: number };

/**
 * Runs a server action from a list row. When `confirm` is set the action is
 * gated behind an inline confirmation, so destructive operations always take
 * two deliberate clicks — there is no undo for a delete.
 */
export function ActionButton({
  action,
  children,
  confirm,
  variant = "ghost",
  size = "sm",
  className,
  title,
  redirectTo,
}: {
  action: () => Promise<Result>;
  children: ReactNode;
  confirm?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  className?: string;
  title?: string;
  /** Where to send the user after a successful run. */
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const run = () => {
    startTransition(async () => {
      try {
        const result = await action();
        if (result.ok) {
          if (result.message) toast.success(result.message);
          if (redirectTo) router.push(redirectTo);
          else router.refresh();
        } else {
          toast.error(result.message || "That didn't work.");
        }
      } catch (error) {
        // A thrown action means the session died or the DB rejected the write.
        toast.error(error instanceof Error ? error.message : "Something went wrong.");
      } finally {
        setConfirming(false);
      }
    });
  };

  if (confirm && confirming) {
    return (
      <span className="inline-flex items-center gap-1">
        <Button
          type="button"
          variant="destructive"
          size={size}
          disabled={pending}
          onClick={run}
          className={className}
        >
          {pending ? "Working…" : confirm}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size={size}
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </span>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      title={title}
      disabled={pending}
      className={cn(className)}
      onClick={() => (confirm ? setConfirming(true) : run())}
    >
      {pending ? "Working…" : children}
    </Button>
  );
}
