"use client";

import {
  deletePostAction,
  duplicatePostAction,
  setPostStatusAction,
} from "@/app/actions/admin/blog";
import { ContentRowActions } from "@/components/admin/content-row-actions";

export function PostRowActions({
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
      editHref={`/admin/blog/${id}`}
      viewHref={`/blog/${slug}`}
      onPublish={() => setPostStatusAction(id, "published")}
      onUnpublish={() => setPostStatusAction(id, "draft")}
      onArchive={() => setPostStatusAction(id, "archived")}
      onDuplicate={() => duplicatePostAction(id)}
      onDelete={() => deletePostAction(id)}
    />
  );
}
