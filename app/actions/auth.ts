"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { clearSession, findOrCreateUser, findUserByEmail, setSession } from "@/lib/auth";
import { createContact } from "@/lib/hubspot";

export type AuthState = { error?: string } | undefined;

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

const signupSchema = loginSchema.extend({
  name: z.string().trim().min(2, "Please enter your name."),
});

/**
 * MOCK LOGIN — any password is accepted, and an unknown email creates an
 * account on the spot. The session cookie itself is real and HMAC-signed.
 */
export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await findUserByEmail(email);

  const user = existing
    ? { id: existing.id, email: existing.email, name: existing.name }
    : await findOrCreateUser(
        email,
        // Derive a display name from the address for brand-new accounts.
        email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        await bcrypt.hash(String(formData.get("password") ?? "demo"), 10),
      );

  await setSession(user);
  revalidatePath("/", "layout");
  redirect(String(formData.get("redirectTo") || "/account"));
}

export async function signupAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const user = await findOrCreateUser(
    parsed.data.email,
    parsed.data.name,
    await bcrypt.hash(String(formData.get("password") ?? "demo"), 10),
  );

  // Step 6/23 — mirror the new account into HubSpot. Non-fatal: a CRM outage
  // must never block sign-up.
  try {
    await createContact({ email: user.email, name: user.name });
  } catch (err) {
    console.error("[signup] HubSpot contact sync failed:", err);
  }

  await setSession(user);
  revalidatePath("/", "layout");
  redirect("/account");
}

export async function logoutAction() {
  await clearSession();
  revalidatePath("/", "layout");
  redirect("/");
}
