"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";

import { useReducedMotionPreference } from "@/components/providers/motion-provider";
import { ArrowUp, MessageCircle, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/stores/cart";

const EASE = [0.16, 1, 0.3, 1] as const;

type ProductCardData = {
  slug: string;
  name: string;
  subtitle: string;
  price: number;
  wasPrice: number | null;
  image: string;
  rating: number;
  reviewCount: number;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: ProductCardData[];
  /** Which backend answered — surfaced quietly so the state is never a mystery. */
  source?: "ollama" | "fallback";
};

const OPENERS = [
  "Recommend a firm ground boot under $200",
  "Do your shoes run true to size?",
  "What's your returns policy?",
  "Best shoe for long runs?",
];

const GREETING: Message = {
  id: "greeting",
  role: "assistant",
  content:
    "Hi — I'm the Veloce assistant. Ask me about any shoe in the range, sizing, delivery, returns, or an order you've placed.",
};

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const reduced = useReducedMotionPreference();

  // The launcher lives in the same bottom-right corner as the cart drawer's
  // checkout buttons. On a phone the drawer is full width, so it sat on top of
  // "View cart" — it steps aside while the cart is open.
  const cartOpen = useCart((s) => s.isOpen);
  const hideLauncher = cartOpen && !open;

  // Pin to the newest message as tokens arrive.
  //
  // Instant while streaming: a smooth scroll restarted on every token never
  // settles, so the transcript juddered and the main thread spent its budget
  // on scroll animation instead of painting text.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: reduced || streaming ? "auto" : "smooth",
    });
  }, [messages, reduced, streaming]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 250);
  }, [open]);

  // Start loading the model the moment the panel opens, so the ~15s cold start
  // overlaps with the customer reading the greeting and typing. Fire-and-forget:
  // if it fails the chat endpoint still answers from the catalogue.
  const warmed = useRef(false);
  useEffect(() => {
    if (!open || warmed.current) return;
    warmed.current = true;
    void fetch("/api/chat/warm", { method: "POST" }).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const userMessage: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    const assistantId = `a-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setInput("");
    setStreaming(true);

    try {
      const history = [...messages, userMessage]
        .filter((m) => m.id !== "greeting")
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      // Product cards arrive as a header so the body stays plain text.
      let products: ProductCardData[] | undefined;
      const encoded = response.headers.get("X-Veloce-Products");
      if (encoded) {
        try {
          products = JSON.parse(atob(encoded)) as ProductCardData[];
        } catch {
          /* malformed header — cards are optional */
        }
      }
      const source =
        (response.headers.get("X-Veloce-Source") as Message["source"]) ?? undefined;

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      // Ollama emits tokens far faster than the screen refreshes. Committing
      // each one to React state re-rendered the whole transcript dozens of
      // times a second — that was the lag. Coalescing to one paint per frame
      // keeps the typing effect identical and the render count sane.
      let queued = false;
      const flush = () => {
        queued = false;
        const snapshot = accumulated;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: snapshot } : m)),
        );
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        if (!queued) {
          queued = true;
          requestAnimationFrame(flush);
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: accumulated.trim(), products, source }
            : m,
        ),
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "Something went wrong reaching the assistant. Try again in a moment.",
              }
            : m,
        ),
      );
    } finally {
      setStreaming(false);
    }
  }

  return (
    <>
      {/* Launcher */}
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: hideLauncher ? 0 : 1,
          opacity: hideLauncher ? 0 : 1,
        }}
        transition={{ delay: hideLauncher ? 0 : 1.2, type: "spring", stiffness: 380, damping: 24 }}
        whileTap={{ scale: 0.92 }}
        aria-hidden={hideLauncher}
        className={cn(
          "bottom-safe fixed right-5 z-[70] grid size-14 place-items-center rounded-full bg-foreground text-background shadow-lg shadow-black/20 md:bottom-7 md:right-7",
          hideLauncher && "pointer-events-none",
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? "close" : "open"}
            initial={{ rotate: -90, opacity: 0, scale: 0.7 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.2 }}
          >
            {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.35, ease: EASE }}
            style={{ transformOrigin: "bottom right" }}
            className={cn(
              "fixed z-[69] flex flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl shadow-black/25",
              // Full-width sheet on mobile, floating panel on desktop.
              "inset-x-3 bottom-24 max-h-[70dvh]",
              "sm:inset-x-auto sm:right-7 sm:bottom-24 sm:w-[26rem] sm:max-h-[min(34rem,70dvh)]",
            )}
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold tracking-tight">
                  Veloce Assistant
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Answers from the live catalogue
                </p>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              data-lenis-prevent
              className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
            >
              {messages.map((message) => (
                <div key={message.id}>
                  <div
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className={cn(
                        "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                        message.role === "user"
                          ? "rounded-br-sm bg-foreground text-background"
                          : "rounded-bl-sm bg-muted",
                      )}
                    >
                      {message.content || (streaming && <TypingDots />)}
                    </motion.div>
                  </div>

                  {/* Rich product cards */}
                  {message.products && message.products.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.products.map((product, i) => (
                        <motion.div
                          key={product.slug}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.07, duration: 0.35, ease: EASE }}
                        >
                          <Link
                            href={`/product/${product.slug}`}
                            onClick={() => setOpen(false)}
                            className="group flex items-center gap-3 rounded-xl border border-border p-2 transition-colors hover:border-foreground/40"
                          >
                            <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface">
                              {product.image && (
                                <Image
                                  src={product.image}
                                  alt={product.name}
                                  fill
                                  sizes="56px"
                                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-display text-sm font-bold">
                                {product.name}
                              </p>
                              <p className="truncate text-[11px] text-muted-foreground">
                                {product.subtitle}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-medium tabular-nums">
                                {formatPrice(product.price)}
                              </p>
                              {product.wasPrice && (
                                <p className="text-[11px] text-muted-foreground line-through tabular-nums">
                                  {formatPrice(product.wasPrice)}
                                </p>
                              )}
                            </div>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {message.source === "fallback" && message.content && (
                    <p className="mt-1.5 text-[10px] text-muted-foreground">
                      Offline mode — Ollama isn&apos;t running, so this came straight from
                      the catalogue.
                    </p>
                  )}
                </div>
              ))}

              {/* Openers, only before the first question. */}
              {messages.length === 1 && (
                <div className="space-y-2 pt-1">
                  {OPENERS.map((opener, i) => (
                    <motion.button
                      key={opener}
                      type="button"
                      onClick={() => send(opener)}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.06, duration: 0.35 }}
                      className="block w-full rounded-full border border-border px-3.5 py-2 text-left text-xs transition-colors hover:border-foreground/50 hover:bg-muted"
                    >
                      {opener}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="border-t border-border p-3"
            >
              <div className="flex items-end gap-2 rounded-2xl border border-border px-3 py-2 transition-colors focus-within:border-foreground/40">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter sends; Shift+Enter makes a new line.
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  rows={1}
                  placeholder="Ask about a shoe, size or order…"
                  aria-label="Message the assistant"
                  className="max-h-24 min-h-[1.5rem] flex-1 resize-none bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground/70"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || streaming}
                  aria-label="Send"
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-30"
                >
                  <ArrowUp className="size-4" strokeWidth={2.2} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-muted-foreground"
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </span>
  );
}
