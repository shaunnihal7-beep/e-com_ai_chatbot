import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { adminUsers, type AdminRole } from "@/db/schema";

/**
 * REAL AUTH — unlike lib/auth.ts, which mocks the storefront login.
 *
 * Passwords are bcrypt-verified, the session cookie is HMAC-signed with an
 * embedded expiry, and repeated failures are throttled per email+IP. Nothing
 * here trusts a value that came from the client.
 */

const COOKIE = "veloce_admin";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours — admin sessions are short
const BCRYPT_ROUNDS = 12;

export type AdminSession = {
  id: number;
  email: string;
  name: string;
  role: AdminRole;
  /** Epoch ms. Checked on every read; an expired token is treated as absent. */
  exp: number;
};

function secret(): string {
  const value = process.env.SESSION_SECRET;
  // A missing secret in production would silently sign every cookie with a
  // known constant, so refuse to start rather than pretend to be secure.
  if (!value || value === "change_me") {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_SECRET must be set to a unique value before running in production.",
      );
    }
    return "veloce_admin_dev_fallback_secret";
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function serialise(session: AdminSession): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function deserialise(token: string): AdminSession | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  // Constant-time compare so a signature can't be recovered by timing.
  if (
    expected.length !== signature.length ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  ) {
    return null;
  }

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as AdminSession;
    if (typeof session.exp !== "number" || session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Passwords                                                           */
/* ------------------------------------------------------------------ */

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * A bcrypt hash of a random string, compared against when the email doesn't
 * exist. Without this, "unknown email" would return far faster than "wrong
 * password" and the response time would leak which accounts are real.
 */
const DECOY_HASH = bcrypt.hashSync(randomBytes(16).toString("hex"), BCRYPT_ROUNDS);

/* ------------------------------------------------------------------ */
/* Throttling                                                          */
/* ------------------------------------------------------------------ */

type Attempt = { count: number; firstAt: number; lockedUntil: number };

// In-memory and therefore per-process: enough to blunt online guessing in this
// single-node deployment. A multi-node one would move this to Redis/Postgres.
const globalForThrottle = globalThis as unknown as {
  __veloce_admin_attempts?: Map<string, Attempt>;
};
const attempts =
  globalForThrottle.__veloce_admin_attempts ?? new Map<string, Attempt>();
globalForThrottle.__veloce_admin_attempts = attempts;

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 1000 * 60 * 15;
const LOCKOUT_MS = 1000 * 60 * 15;

export function throttleStatus(key: string): { locked: boolean; retryInMs: number } {
  const record = attempts.get(key);
  if (!record) return { locked: false, retryInMs: 0 };

  if (record.lockedUntil > Date.now()) {
    return { locked: true, retryInMs: record.lockedUntil - Date.now() };
  }
  // Window elapsed — forget the old failures.
  if (Date.now() - record.firstAt > WINDOW_MS) {
    attempts.delete(key);
  }
  return { locked: false, retryInMs: 0 };
}

export function recordFailure(key: string) {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || now - record.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now, lockedUntil: 0 });
    return;
  }

  record.count += 1;
  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
    record.count = 0;
    record.firstAt = now;
  }
}

export function clearFailures(key: string) {
  attempts.delete(key);
}

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  return token ? deserialise(token) : null;
}

/**
 * Every admin page and every admin server action calls this. Middleware only
 * checks that a cookie exists — it runs on the edge runtime where node:crypto
 * isn't available, so signature verification has to happen here.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  // Re-check the account on every request: deactivating an admin takes effect
  // immediately instead of waiting for their cookie to expire.
  const account = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.id, session.id),
    columns: { id: true, isActive: true, role: true },
  });
  if (!account || !account.isActive) {
    // Can't mutate cookies during a layout/page render (only Server Actions and
    // Route Handlers can), so just redirect; a fresh login overwrites the stale
    // cookie via setAdminSession(), which runs from a Server Action.
    redirect("/admin/login");
  }

  // Role is read from the database, not the cookie, so a demotion applies at once.
  return { ...session, role: account.role as AdminRole };
}

/** Throws instead of redirecting — for server actions, which can't redirect mid-mutation. */
export async function requireAdminAction(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) throw new Error("Not signed in.");

  const account = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.id, session.id),
    columns: { id: true, isActive: true, role: true },
  });
  if (!account || !account.isActive) throw new Error("Account is no longer active.");

  return { ...session, role: account.role as AdminRole };
}

export async function setAdminSession(user: {
  id: number;
  email: string;
  name: string;
  role: AdminRole;
}) {
  const store = await cookies();
  const session: AdminSession = { ...user, exp: Date.now() + SESSION_TTL_MS };

  store.set(COOKIE, serialise(session), {
    httpOnly: true,
    sameSite: "strict", // stricter than the storefront cookie: blocks cross-site CSRF
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(COOKIE);
}

/* ------------------------------------------------------------------ */
/* Credentials                                                         */
/* ------------------------------------------------------------------ */

export async function verifyAdminCredentials(
  email: string,
  password: string,
): Promise<{ id: number; email: string; name: string; role: AdminRole } | null> {
  const account = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.email, email.toLowerCase().trim()),
  });

  // Always run a comparison, even with no account, to keep timing flat.
  const ok = await verifyPassword(password, account?.passwordHash ?? DECOY_HASH);
  if (!account || !ok || !account.isActive) return null;

  await db
    .update(adminUsers)
    .set({ lastLoginAt: new Date() })
    .where(eq(adminUsers.id, account.id));

  return {
    id: account.id,
    email: account.email,
    name: account.name,
    role: account.role as AdminRole,
  };
}

/** Owners and admins can manage other admin accounts; editors cannot. */
export function canManageAdmins(role: AdminRole): boolean {
  return role === "owner" || role === "admin";
}
