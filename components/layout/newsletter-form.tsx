"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";

import { subscribeAction } from "@/app/actions/newsletter";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending || done) return;

    setPending(true);
    const result = await subscribeAction(email);
    setPending(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setDone(true);
    toast.success(result.message);
  }

  return (
    <form onSubmit={onSubmit} className="w-full">
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <div className="flex items-center gap-3 border-b border-foreground/25 pb-3 transition-colors focus-within:border-foreground">
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          disabled={done}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full bg-transparent text-lg outline-none placeholder:text-muted-foreground/60 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={pending || done}
          aria-label="Subscribe"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-foreground text-background transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={done ? "done" : "idle"}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {done ? <Check className="size-4" /> : <ArrowRight className="size-4" />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>
    </form>
  );
}
