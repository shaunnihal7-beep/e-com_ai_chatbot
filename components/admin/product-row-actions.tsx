"use client";

import { useState } from "react";
import { Copy, ExternalLink, MoreHorizontal, Pencil } from "lucide-react";

import {
  deleteProductAction,
  duplicateProductAction,
  setProductStatusAction,
} from "@/app/actions/admin/products";
import { ActionButton } from "@/components/admin/action-button";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";

/**
 * Row-level controls. The common actions sit inline; the rest live behind a
 * disclosure so a 20-row table doesn't turn into a wall of buttons.
 */
export function ProductRowActions({
  id,
  slug,
  status,
  name,
}: {
  id: number;
  slug: string;
  status: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center justify-end gap-1">
      <ButtonLink
        href={`/admin/products/${id}`}
        variant="ghost"
        size="icon-sm"
        title={`Edit ${name}`}
      >
        <Pencil className="size-3.5" aria-hidden />
        <span className="sr-only">Edit {name}</span>
      </ButtonLink>

      <ButtonLink
        href={`/product/${slug}`}
        target="_blank"
        variant="ghost"
        size="icon-sm"
        title="View on storefront"
      >
        <ExternalLink className="size-3.5" aria-hidden />
        <span className="sr-only">View {name} on the storefront</span>
      </ButtonLink>

      <Button
        variant="ghost"
        size="icon-sm"
        title="More actions"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal className="size-3.5" aria-hidden />
        <span className="sr-only">More actions for {name}</span>
      </Button>

      {open ? (
        <div className="flex flex-wrap items-center justify-end gap-1 border-l border-border pl-1">
          {status === "published" ? (
            <ActionButton action={() => setProductStatusAction(id, "draft")} size="xs">
              Unpublish
            </ActionButton>
          ) : (
            <ActionButton action={() => setProductStatusAction(id, "published")} size="xs">
              Publish
            </ActionButton>
          )}

          <ActionButton action={() => duplicateProductAction(id)} size="xs" title="Duplicate">
            <Copy className="size-3" aria-hidden />
            Duplicate
          </ActionButton>

          {status !== "archived" ? (
            <ActionButton action={() => setProductStatusAction(id, "archived")} size="xs">
              Archive
            </ActionButton>
          ) : (
            <ActionButton action={() => setProductStatusAction(id, "draft")} size="xs">
              Restore
            </ActionButton>
          )}

          <ActionButton
            action={() => deleteProductAction(id)}
            size="xs"
            variant="destructive"
            confirm="Delete forever"
          >
            Delete
          </ActionButton>
        </div>
      ) : null}
    </div>
  );
}
