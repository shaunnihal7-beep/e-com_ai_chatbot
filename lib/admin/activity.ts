import "server-only";

import { db } from "@/db";
import { activityLog } from "@/db/schema";
import type { AdminSession } from "@/lib/admin/auth";

export type ActivityAction =
  | "created"
  | "updated"
  | "deleted"
  | "duplicated"
  | "published"
  | "unpublished"
  | "archived"
  | "restored"
  | "approved"
  | "rejected"
  | "replied"
  | "signed-in"
  | "signed-out";

export type ActivityEntity =
  | "product"
  | "review"
  | "post"
  | "page"
  | "order"
  | "category"
  | "tag"
  | "admin";

/**
 * Writes one audit row. Never throws: an activity-feed failure must not roll
 * back the mutation that succeeded, so errors are logged and swallowed.
 */
export async function logActivity(
  actor: Pick<AdminSession, "id" | "name">,
  action: ActivityAction,
  entityType: ActivityEntity,
  summary: string,
  entityId?: number,
) {
  try {
    await db.insert(activityLog).values({
      actorId: actor.id,
      actorName: actor.name,
      action,
      entityType,
      entityId: entityId ?? null,
      summary,
    });
  } catch (error) {
    console.error("[activity] failed to record entry:", error);
  }
}
