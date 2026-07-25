import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { getAdminSession } from "@/lib/admin/auth";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  // Already signed in — don't show a login form to someone who has a session.
  if (await getAdminSession()) redirect("/admin");

  const { redirectTo } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-display text-2xl font-semibold tracking-tight">VELOCE</p>
          <p className="mt-1 text-sm text-muted-foreground">Content Management System</p>
        </div>

        <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
          <h1 className="font-display text-lg font-semibold">Sign in</h1>
          <p className="mt-1 mb-5 text-sm text-muted-foreground">
            Enter your administrator credentials.
          </p>

          <LoginForm redirectTo={redirectTo} />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Protected area. All actions are recorded against your account.
        </p>
      </div>
    </div>
  );
}
