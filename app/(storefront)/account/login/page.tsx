import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { AuthForm } from "@/components/account/auth-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Veloce account.",
};

export default async function LoginPage() {
  if (await getSession()) redirect("/account");

  return (
    // AuthForm reads searchParams for redirectTo, so it needs a Suspense edge.
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
