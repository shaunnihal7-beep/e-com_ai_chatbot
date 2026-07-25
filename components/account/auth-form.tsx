"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginAction, signupAction, type AuthState } from "@/app/actions/auth";
import { SplitWords } from "@/components/motion/reveal";

const EASE = [0.16, 1, 0.3, 1] as const;

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const isLogin = mode === "login";
  const action = isLogin ? loginAction : signupAction;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    undefined,
  );

  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/account";

  return (
    <div className="container-page flex min-h-[80dvh] items-center justify-center pb-20 pt-28">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="w-full max-w-sm"
      >
        <p className="text-eyebrow text-brand">
          {isLogin ? "Welcome back" : "Join Veloce"}
        </p>
        <h1 className="mt-4 text-display-md">
          <SplitWords text={isLogin ? "Sign in" : "Create account"} />
        </h1>

        <form action={formAction} className="mt-9 space-y-4">
          <input type="hidden" name="redirectTo" value={redirectTo} />

          {!isLogin && (
            <div>
              <label htmlFor="name" className="text-eyebrow text-muted-foreground">
                Name
              </label>
              <Input
                id="name"
                name="name"
                required
                autoComplete="name"
                className="mt-2 h-12"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="text-eyebrow text-muted-foreground">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={isLogin ? "demo@veloce.com" : ""}
              className="mt-2 h-12"
            />
          </div>

          <div>
            <label htmlFor="password" className="text-eyebrow text-muted-foreground">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete={isLogin ? "current-password" : "new-password"}
              defaultValue={isLogin ? "demo1234" : ""}
              className="mt-2 h-12"
            />
          </div>

          {state?.error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-destructive"
            >
              {state.error}
            </motion.p>
          )}

          <Button
            type="submit"
            disabled={pending}
            className="h-13 w-full rounded-full text-sm font-semibold"
          >
            {pending ? "One moment…" : isLogin ? "Sign in" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isLogin ? "New to Veloce? " : "Already have an account? "}
          <Link
            href={isLogin ? "/account/signup" : "/account/login"}
            className="font-medium text-foreground underline underline-offset-4"
          >
            {isLogin ? "Create an account" : "Sign in"}
          </Link>
        </p>

        <div className="mt-9 rounded-lg border border-border bg-surface p-4">
          <p className="text-eyebrow text-muted-foreground">Demo store</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Authentication is mocked. Any email and password will sign you in — the
            prefilled <span className="text-foreground">demo@veloce.com</span> account
            comes with order history.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
