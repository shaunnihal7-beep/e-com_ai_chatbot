"use client";

import {
  deletePageAction,
  duplicatePageAction,
  setPageStatusAction,
} from "@/app/actions/admin/pages";
import { ContentRowActions } from "@/components/admin/content-row-actions";

export function PageRowActions({
  id,
  slug,
  status,
}: {
  id: number;
  slug: string;
  status: string;
}) {
  return (
    <ContentRowActions
      status={status}
      editHref={`/admin/pages/${id}`}
      viewHref={`/${slug}`}
      onPublish={() => setPageStatusAction(id, "published")}
      onUnpublish={() => setPageStatusAction(id, "draft")}
      onArchive={() => setPageStatusAction(id, "archived")}
      onDuplicate={() => duplicatePageAction(id)}
      onDelete={() => deletePageAction(id)}
    />
  );
}
