import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * MOCK AUTH — deliberately not production-grade.
 *
 * The session cookie is HMAC-signed and HTTP-only, so it can't be forged from
 * the client, but sign-up accepts any password and login does not enforce one.
 * Swap `verifyCredentials` for a real bcrypt comparison and this becomes a
 * genuine credentials flow without touching anything else.
 */

const COOKIE = "veloce_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type SessionUser = {
  id: number;
  email: string;
  name: string;
};

function secret(): string {
  return process.env.SESSION_SECRET ?? "veloce_dev_fallback_secret";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function serialise(user: SessionUser): string {
  const payload = Buffer.from(JSON.stringify(user)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function deserialise(token: string): SessionUser | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  // Constant-time compare so the signature can't be brute-forced by timing.
  if (
    expected.length !== signature.length ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  ) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  return token ? deserialise(token) : null;
}

export async function setSession(user: SessionUser) {
  const store = await cookies();
  store.set(COOKIE, serialise(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE);
}

/**
 * Mock verification: finds-or-creates the account and lets anyone in.
 * The password is stored on sign-up but never checked.
 */
export async function findOrCreateUser(
  email: string,
  name: string,
  passwordHash: string,
): Promise<SessionUser> {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  if (existing) {
    return { id: existing.id, email: existing.email, name: existing.name };
  }

  const [created] = await db
    .insert(users)
    .values({ email: email.toLowerCase(), name, passwordHash })
    .returning();

  return { id: created.id, email: created.email, name: created.name };
}

export async function findUserByEmail(email: string) {
  return db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
}
