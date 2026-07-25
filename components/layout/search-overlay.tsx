"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Search, X } from "lucide-react";

import { searchAction } from "@/app/actions/search";
import { formatPrice } from "@/lib/format";
import type { ProductCard } from "@/lib/types";

const SUGGESTIONS = [
  "Carbon plate",
  "Firm ground",
  "High top",
  "Training",
  "Volt",
  "Under $150",
];

export function SearchOverlay({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductCard[]>([]);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Debounce so a fast typist doesn't fire a query per keystroke.
  useEffect(() => {
    if (!open) return;
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      startTransition(async () => setResults(await searchAction(query)));
    }, 220);
    return () => clearTimeout(timer);
  }, [query, open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      // Wait for the panel to exist before focusing.
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Escape closes, and the page behind must not scroll.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onOpenChange]);

  function submit(e?: React.SyntheticEvent) {
    e?.preventDefault();
    if (!query.trim()) return;
    onOpenChange(false);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[60] bg-background/98 backdrop-blur-xl"
        >
          <div className="container-page flex h-full flex-col pt-6">
            <div className="flex items-center justify-between">
              <span className="font-display text-xl font-bold tracking-[-0.06em]">
                VELOCE
              </span>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close search"
                className="-mr-2 flex size-11 items-center justify-center transition-opacity hover:opacity-60"
              >
                <X className="size-5" strokeWidth={1.6} />
              </button>
            </div>

            <motion.form
              onSubmit={submit}
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="mt-10 border-b border-border pb-4"
            >
              <div className="flex items-center gap-4">
                <Search className="size-6 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for a shoe, a sport, a technology"
                  aria-label="Search products"
                  className="w-full bg-transparent font-display text-2xl font-medium tracking-tight outline-none placeholder:text-muted-foreground/60 md:text-4xl"
                />
              </div>
            </motion.form>

            <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto py-8">
              {query.trim().length < 2 ? (
                <div>
                  <p className="text-eyebrow text-muted-foreground">Popular searches</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s, i) => (
                      <motion.button
                        key={s}
                        type="button"
                        onClick={() => setQuery(s)}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12 + i * 0.04, duration: 0.4 }}
                        className="rounded-full border border-border px-4 py-2 text-sm transition-colors hover:border-foreground"
                      >
                        {s}
                      </motion.button>
                    ))}
                  </div>
                </div>
              ) : results.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {pending ? "Searching…" : `No matches for "${query}".`}
                </p>
              ) : (
                <div>
                  <p className="text-eyebrow text-muted-foreground">
                    {results.length} {results.length === 1 ? "result" : "results"}
                  </p>
                  <ul className="mt-5 divide-y divide-border">
                    {results.map((product, i) => {
                      const color = product.colors[0];
                      return (
                        <motion.li
                          key={product.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.035, duration: 0.35 }}
                        >
                          <Link
                            href={`/product/${product.slug}`}
                            onClick={() => onOpenChange(false)}
                            className="group flex items-center gap-4 py-3"
                          >
                            <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-surface">
                              {color?.images[0] && (
                                <Image
                                  src={color.images[0].url}
                                  alt={color.images[0].alt}
                                  fill
                                  sizes="64px"
                                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold">{product.name}</p>
                              <p className="truncate text-sm text-muted-foreground">
                                {product.categoryName}
                              </p>
                            </div>
                            <p className="shrink-0 text-sm font-medium">
                              {formatPrice(product.salePriceCents ?? product.priceCents)}
                            </p>
                          </Link>
                        </motion.li>
                      );
                    })}
                  </ul>

                  <button
                    type="button"
                    onClick={() => submit()}
                    className="text-eyebrow mt-8 underline underline-offset-4"
                  >
                    View all results
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
