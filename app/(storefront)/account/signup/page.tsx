import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { AuthForm } from "@/components/account/auth-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a Veloce account.",
};

export default async function SignupPage() {
  if (await getSession()) redirect("/account");

  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
