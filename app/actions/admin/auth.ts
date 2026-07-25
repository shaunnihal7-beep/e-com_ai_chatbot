"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";

import { logActivity } from "@/lib/admin/activity";
import {
  clearAdminSession,
  clearFailures,
  getAdminSession,
  recordFailure,
  setAdminSession,
  throttleStatus,
  verifyAdminCredentials,
} from "@/lib/admin/auth";

export type AuthState = { ok: boolean; message: string };

const schema = z.object({
  email: z.string().trim().min(1, "Enter your email.").email("That isn't a valid email."),
  password: z.string().min(1, "Enter your password."),
  redirectTo: z.string().optional(),
});

/** Only same-origin admin paths are honoured, so ?redirectTo can't bounce elsewhere. */
function safeRedirect(target: string | undefined): string {
  if (!target) return "/admin";
  if (!target.startsWith("/admin") || target.startsWith("//")) return "/admin";
  return target;
}

export async function adminLoginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    redirectTo: formData.get("redirectTo") ?? undefined,
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const { email, password, redirectTo } = parsed.data;

  // Throttle on email + client IP together: one attacker can't lock out a real
  // admin by guessing at their address from elsewhere.
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    "local";
  const key = `${email.toLowerCase()}|${ip}`;

  const throttle = throttleStatus(key);
  if (throttle.locked) {
    const minutes = Math.ceil(throttle.retryInMs / 60000);
    return {
      ok: false,
      message: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  const account = await verifyAdminCredentials(email, password);

  if (!account) {
    recordFailure(key);
    // Deliberately identical for a wrong password and an unknown account.
    return { ok: false, message: "Email or password is incorrect." };
  }

  clearFailures(key);
  await setAdminSession(account);
  await logActivity(account, "signed-in", "admin", `${account.name} signed in`, account.id);

  redirect(safeRedirect(redirectTo));
}

export async function adminLogoutAction() {
  const session = await getAdminSession();
  await clearAdminSession();
  if (session) {
    await logActivity(session, "signed-out", "admin", `${session.name} signed out`, session.id);
  }
  redirect("/admin/login");
}
