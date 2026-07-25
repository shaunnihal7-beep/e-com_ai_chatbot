"use client";

import { useActionState } from "react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitContactAction, type ContactState } from "@/app/actions/contact";
import { SplitWords } from "@/components/motion/reveal";

const EASE = [0.16, 1, 0.3, 1] as const;

export function ContactForm() {
  const [state, formAction, pending] = useActionState<ContactState, FormData>(
    submitContactAction,
    undefined,
  );

  return (
    <div className="container-page flex min-h-[80dvh] items-center justify-center pb-20 pt-28">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="w-full max-w-md"
      >
        <p className="text-eyebrow text-brand">Need help?</p>
        <h1 className="mt-4 text-display-md">
          <SplitWords text="Contact us" />
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Send us a message and our team will get back to you. Every enquiry is logged
          against your record in our CRM.
        </p>

        {state?.success ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-9 rounded-lg border border-border bg-surface p-6 text-center"
          >
            <p className="text-lg font-semibold">Thanks — we’ve got your message.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Your enquiry has reached our support team and we’ll be in touch by email.
            </p>
          </motion.div>
        ) : (
          <form action={formAction} className="mt-9 space-y-4">
            <div>
              <label htmlFor="name" className="text-eyebrow text-muted-foreground">
                Name
              </label>
              <Input id="name" name="name" required autoComplete="name" className="mt-2 h-12" />
            </div>

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
                className="mt-2 h-12"
              />
            </div>

            <div>
              <label htmlFor="subject" className="text-eyebrow text-muted-foreground">
                Subject
              </label>
              <Input id="subject" name="subject" required className="mt-2 h-12" />
            </div>

            <div>
              <label htmlFor="message" className="text-eyebrow text-muted-foreground">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={5}
                className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
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
              {pending ? "Sending…" : "Send message"}
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
