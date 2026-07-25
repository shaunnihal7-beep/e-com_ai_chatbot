import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { findUserByEmail, findOrCreateUser, setSession } from "@/lib/auth";
import { createContact } from "@/lib/hubspot";

/**
 * POST /api/register
 *
 * Flow (mirrors the tutorial):
 *   validate input
 *     ↓
 *   save user to our database
 *     ↓
 *   create the matching HubSpot contact
 *     ↓
 *   return success
 *
 * The HubSpot sync is deliberately non-fatal: if HubSpot is unreachable, the
 * user is still registered in our own system. A failed CRM sync should never
 * cost us a real sign-up — we just log it and move on.
 */
export async function POST(request: Request) {
  let body: { email?: string; name?: string; password?: string; phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim();
  const password = body.password;
  const phone = body.phone?.trim();

  if (!email || !name || !password) {
    return NextResponse.json(
      { error: "email, name and password are required." },
      { status: 400 },
    );
  }

  if (await findUserByEmail(email)) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 },
    );
  }

  // 1. Save user to our database (password stored bcrypt-hashed).
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await findOrCreateUser(email, name, passwordHash);

  // 2. Create the HubSpot contact — non-fatal on failure.
  try {
    await createContact({ email, name, phone });
  } catch (err) {
    console.error("[register] HubSpot contact sync failed:", err);
  }

  // 3. Log the new user in and return success.
  await setSession(user);

  return NextResponse.json({ user }, { status: 201 });
}
