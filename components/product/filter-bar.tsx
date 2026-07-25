"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatPrice, formatSize } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SortKey } from "@/lib/types";
import { usePreserveScroll } from "@/lib/hooks/use-preserve-scroll";

export type Facets = {
  colors: { slug: string; name: string; hex: string }[];
  sizes: number[];
  minPrice: number;
  maxPrice: number;
  total: number;
};

const SORTS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
];

/**
 * All filter state lives in the URL, so a filtered view is shareable, works
 * with back/forward, and needs no client store.
 */
export function FilterBar({ facets, count }: { facets: Facets; count: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  usePreserveScroll(open);

  const selectedSizes = params.getAll("size").map(Number);
  const selectedColors = params.getAll("color");
  const onSale = params.get("sale") === "1";
  const sort = (params.get("sort") as SortKey) ?? "featured";

  const activeCount =
    selectedSizes.length + selectedColors.length + (onSale ? 1 : 0);

  const push = useCallback(
    (next: URLSearchParams) => {
      const query = next.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const toggleMulti = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      const current = next.getAll(key);
      next.delete(key);
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      updated.forEach((v) => next.append(key, v));
      push(next);
    },
    [params, push],
  );

  const setSingle = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null) next.delete(key);
      else next.set(key, value);
      push(next);
    },
    [params, push],
  );

  const clearAll = useCallback(() => {
    const next = new URLSearchParams();
    const keep = params.get("sort");
    if (keep) next.set("sort", keep);
    push(next);
  }, [params, push]);

  const filterPanel = (
    <div className="space-y-9">
      {/* Sizes */}
      <fieldset>
        <legend className="text-eyebrow text-muted-foreground">Size (US)</legend>
        <div className="mt-4 grid grid-cols-5 gap-1.5 sm:grid-cols-6">
          {facets.sizes.map((size) => {
            const active = selectedSizes.includes(size);
            return (
              <button
                key={size}
                type="button"
                aria-pressed={active}
                onClick={() => toggleMulti("size", String(size))}
                className={cn(
                  "min-h-11 rounded-md border text-sm font-medium transition-colors",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:border-foreground",
                )}
              >
                {formatSize(size)}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Colours */}
      <fieldset>
        <legend className="text-eyebrow text-muted-foreground">Colour</legend>
        <div className="mt-4 space-y-2.5">
          {facets.colors.map((color) => {
            const active = selectedColors.includes(color.slug);
            return (
              <button
                key={color.slug}
                type="button"
                aria-pressed={active}
                onClick={() => toggleMulti("color", color.slug)}
                className="flex min-h-11 w-full items-center gap-3 text-left text-sm"
              >
                <span
                  className={cn(
                    "size-5 shrink-0 rounded-full border transition-shadow",
                    active
                      ? "border-transparent ring-1 ring-foreground ring-offset-2 ring-offset-background"
                      : "border-black/15",
                  )}
                  style={{ backgroundColor: color.hex }}
                />
                <span className={cn(active && "font-medium")}>{color.name}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Sale */}
      <fieldset>
        <legend className="text-eyebrow text-muted-foreground">Offers</legend>
        <button
          type="button"
          aria-pressed={onSale}
          onClick={() => setSingle("sale", onSale ? null : "1")}
          className={cn(
            "mt-4 min-h-11 w-full rounded-md border px-4 text-left text-sm font-medium transition-colors",
            onSale
              ? "border-brand bg-brand text-brand-foreground"
              : "border-border hover:border-foreground",
          )}
        >
          On sale only
        </button>
      </fieldset>

      <p className="text-xs text-muted-foreground">
        Prices from {formatPrice(facets.minPrice)} to {formatPrice(facets.maxPrice)}.
      </p>
    </div>
  );

  return (
    // `pin-under-header` reads the same --header-h the header is sized from, so
    // the bar sits flush against it at every breakpoint instead of drifting.
    <div className="pin-under-header z-30 -mx-5 border-b border-border bg-background/85 px-5 backdrop-blur-md md:-mx-10 md:px-10 xl:-mx-14 xl:px-14">
      <div className="flex items-center justify-between gap-4 py-3.5">
        <div className="flex items-center gap-3">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button variant="outline" size="sm" className="h-10 gap-2 rounded-full" />
              }
            >
              <SlidersHorizontal className="size-3.5" strokeWidth={1.8} />
              Filter
              {activeCount > 0 && (
                <span className="ml-0.5 grid size-5 place-items-center rounded-full bg-foreground text-[10px] font-bold text-background">
                  {activeCount}
                </span>
              )}
            </SheetTrigger>

            {/* Bottom sheet on mobile, side panel from md up. */}
            <SheetContent
              side="bottom"
              data-lenis-prevent
              className="max-h-[85dvh] overflow-y-auto rounded-t-2xl md:inset-y-0 md:right-0 md:left-auto md:h-full md:max-h-none md:w-96 md:rounded-none"
            >
              <SheetHeader className="px-5 pt-5">
                <SheetTitle className="font-display text-2xl font-bold tracking-tight">
                  Filter
                </SheetTitle>
              </SheetHeader>

              <div className="px-5 py-6">{filterPanel}</div>

              <SheetFooter className="sticky bottom-0 flex-row gap-3 border-t bg-background px-5 py-4">
                <Button
                  variant="outline"
                  className="h-12 flex-1 rounded-full"
                  onClick={clearAll}
                  disabled={activeCount === 0}
                >
                  Clear
                </Button>
                <Button
                  className="h-12 flex-1 rounded-full"
                  onClick={() => setOpen(false)}
                >
                  Show {count}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <p className="hidden text-sm text-muted-foreground sm:block">
            {count} {count === 1 ? "style" : "styles"}
          </p>
        </div>

        <Select value={sort} onValueChange={(v) => setSingle("sort", v)}>
          <SelectTrigger className="h-10 w-auto min-w-[9.5rem] rounded-full border-border text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active filter chips */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pb-3.5">
          {selectedSizes.map((size) => (
            <Chip key={`s${size}`} onClear={() => toggleMulti("size", String(size))}>
              US {formatSize(size)}
            </Chip>
          ))}
          {selectedColors.map((slug) => (
            <Chip key={slug} onClear={() => toggleMulti("color", slug)}>
              {facets.colors.find((c) => c.slug === slug)?.name ?? slug}
            </Chip>
          ))}
          {onSale && <Chip onClear={() => setSingle("sale", null)}>On sale</Chip>}
          <button
            type="button"
            onClick={clearAll}
            className="ml-1 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

function Chip({ children, onClear }: { children: React.ReactNode; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border py-1.5 pl-3 pr-2 text-xs">
      {children}
      <button type="button" onClick={onClear} aria-label="Remove filter" className="p-0.5">
        <X className="size-3" />
      </button>
    </span>
  );
}
