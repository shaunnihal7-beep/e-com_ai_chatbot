"use client";

import { useState } from "react";
import { Copy, ExternalLink, MoreHorizontal, Pencil } from "lucide-react";

import { ActionButton } from "@/components/admin/action-button";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";

type Result = { ok: boolean; message: string };

/**
 * Shared lifecycle controls for posts and pages. The parent passes bound
 * actions so this one component serves both without knowing which is which.
 */
export function ContentRowActions({
  status,
  editHref,
  viewHref,
  onPublish,
  onUnpublish,
  onArchive,
  onDuplicate,
  onDelete,
}: {
  status: string;
  editHref: string;
  viewHref?: string;
  onPublish: () => Promise<Result>;
  onUnpublish: () => Promise<Result>;
  onArchive: () => Promise<Result>;
  onDuplicate: () => Promise<Result>;
  onDelete: () => Promise<Result>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center justify-end gap-1">
      <ButtonLink href={editHref} variant="ghost" size="icon-sm" title="Edit">
        <Pencil className="size-3.5" aria-hidden />
        <span className="sr-only">Edit</span>
      </ButtonLink>

      {viewHref && status === "published" ? (
        <ButtonLink href={viewHref} target="_blank" variant="ghost" size="icon-sm" title="View">
          <ExternalLink className="size-3.5" aria-hidden />
          <span className="sr-only">View</span>
        </ButtonLink>
      ) : null}

      <Button
        variant="ghost"
        size="icon-sm"
        title="More actions"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal className="size-3.5" aria-hidden />
        <span className="sr-only">More actions</span>
      </Button>

      {open ? (
        <div className="flex flex-wrap items-center justify-end gap-1 border-l border-border pl-1">
          {status === "published" ? (
            <ActionButton action={onUnpublish} size="xs">
              Unpublish
            </ActionButton>
          ) : (
            <ActionButton action={onPublish} size="xs">
              Publish
            </ActionButton>
          )}

          <ActionButton action={onDuplicate} size="xs">
            <Copy className="size-3" aria-hidden />
            Duplicate
          </ActionButton>

          {status !== "archived" ? (
            <ActionButton action={onArchive} size="xs">
              Archive
            </ActionButton>
          ) : null}

          <ActionButton action={onDelete} size="xs" variant="destructive" confirm="Delete forever">
            Delete
          </ActionButton>
        </div>
      ) : null}
    </div>
  );
}
