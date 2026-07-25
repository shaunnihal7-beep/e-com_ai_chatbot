"use client";

import { ExternalLink } from "lucide-react";

import {
  deleteProductAction,
  duplicateProductAction,
  setProductStatusAction,
} from "@/app/actions/admin/products";
import { ActionButton } from "@/components/admin/action-button";
import { ButtonLink } from "@/components/ui/button-link";

/**
 * Header controls for the edit page. A client component because the closures
 * it hands to <ActionButton> can't cross the server/client boundary from a
 * server-rendered page.
 */
export function ProductDetailActions({
  id,
  slug,
  status,
}: {
  id: number;
  slug: string;
  status: string;
}) {
  return (
    <>
      <ButtonLink href={`/product/${slug}`} target="_blank" variant="outline" size="lg">
        <ExternalLink className="size-3.5" aria-hidden />
        View
      </ButtonLink>

      {status === "published" ? (
        <ActionButton
          action={() => setProductStatusAction(id, "draft")}
          variant="outline"
          size="lg"
        >
          Unpublish
        </ActionButton>
      ) : (
        <ActionButton
          action={() => setProductStatusAction(id, "published")}
          variant="outline"
          size="lg"
        >
          Publish
        </ActionButton>
      )}

      <ActionButton action={() => duplicateProductAction(id)} variant="outline" size="lg">
        Duplicate
      </ActionButton>

      {status !== "archived" ? (
        <ActionButton
          action={() => setProductStatusAction(id, "archived")}
          variant="outline"
          size="lg"
        >
          Archive
        </ActionButton>
      ) : (
        <ActionButton
          action={() => setProductStatusAction(id, "draft")}
          variant="outline"
          size="lg"
        >
          Restore
        </ActionButton>
      )}

      <ActionButton
        action={() => deleteProductAction(id)}
        variant="destructive"
        size="lg"
        confirm="Delete forever"
        redirectTo="/admin/products"
      >
        Delete
      </ActionButton>
    </>
  );
}
