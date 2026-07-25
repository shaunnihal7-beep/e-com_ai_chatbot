"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/** Builds a querystring with `updates` applied, always resetting to page 1. */
function withParams(
  current: URLSearchParams,
  updates: Record<string, string | undefined>,
): string {
  const next = new URLSearchParams(current.toString());

  for (const [key, value] of Object.entries(updates)) {
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
  }
  // Any filter change invalidates the current offset.
  next.delete("page");

  const query = next.toString();
  return query ? `?${query}` : "";
}

/** Debounced search box that writes straight to the URL. */
export function SearchInput({ placeholder = "Search…" }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [value, setValue] = useState(params.get("q") ?? "");
  const initial = useRef(true);

  // Keep in sync when the URL changes from elsewhere (tab click, back button).
  useEffect(() => {
    setValue(params.get("q") ?? "");
  }, [params]);

  useEffect(() => {
    // Don't navigate on mount — only once the user has actually typed.
    if (initial.current) {
      initial.current = false;
      return;
    }

    const timer = setTimeout(() => {
      if ((params.get("q") ?? "") === value) return;
      router.replace(`${pathname}${withParams(params, { q: value || undefined })}`);
    }, 300);

    return () => clearTimeout(timer);
    // `params` is intentionally excluded: including it would re-run the timer
    // on every navigation and fight the sync effect above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, pathname, router]);

  return (
    <div className="relative w-full sm:w-64">
      <Search
        className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 pr-8 pl-8"
      />
      {value ? (
        <button
          type="button"
          onClick={() => setValue("")}
          className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

/** Status tabs rendered as links, so filtering is shareable and back-navigable. */
export function FilterTabs({
  param = "status",
  options,
}: {
  param?: string;
  options: { value: string; label: string; count?: number }[];
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const active = params.get(param) ?? options[0]?.value ?? "all";

  return (
    <div className="flex flex-wrap items-center gap-1">
      {options.map((option) => {
        const selected = active === option.value;
        return (
          <Link
            key={option.value}
            href={`${pathname}${withParams(params, { [param]: option.value })}`}
            aria-current={selected ? "true" : undefined}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-sm",
              selected
                ? "bg-foreground font-medium text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {option.label}
            {typeof option.count === "number" ? (
              <span className="ml-1.5 text-xs tabular-nums opacity-70">{option.count}</span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

/** Generic dropdown filter that writes its value to the URL. */
export function SelectFilter({
  param,
  label,
  options,
}: {
  param: string;
  label: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <label className="flex items-center gap-1.5 text-sm">
      <span className="sr-only">{label}</span>
      <select
        value={params.get(param) ?? "all"}
        onChange={(e) =>
          router.replace(`${pathname}${withParams(params, { [param]: e.target.value })}`)
        }
        className="h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring"
        aria-label={label}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Pagination({
  page,
  pageCount,
  total,
}: {
  page: number;
  pageCount: number;
  total: number;
}) {
  const pathname = usePathname();
  const params = useSearchParams();

  if (pageCount <= 1) {
    return (
      <p className="px-1 py-3 text-xs text-muted-foreground">
        {total} {total === 1 ? "result" : "results"}
      </p>
    );
  }

  const href = (target: number) => {
    const next = new URLSearchParams(params.toString());
    if (target <= 1) next.delete("page");
    else next.set("page", String(target));
    const query = next.toString();
    return `${pathname}${query ? `?${query}` : ""}`;
  };

  return (
    <div className="flex items-center justify-between gap-3 px-1 py-3 text-sm">
      <p className="text-xs text-muted-foreground">
        Page {page} of {pageCount} · {total} {total === 1 ? "result" : "results"}
      </p>

      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link
            href={href(page - 1)}
            className="rounded-lg border border-border px-2.5 py-1.5 text-sm hover:bg-muted"
          >
            Previous
          </Link>
        ) : (
          <span className="rounded-lg border border-border px-2.5 py-1.5 text-sm text-muted-foreground opacity-50">
            Previous
          </span>
        )}

        {page < pageCount ? (
          <Link
            href={href(page + 1)}
            className="rounded-lg border border-border px-2.5 py-1.5 text-sm hover:bg-muted"
          >
            Next
          </Link>
        ) : (
          <span className="rounded-lg border border-border px-2.5 py-1.5 text-sm text-muted-foreground opacity-50">
            Next
          </span>
        )}
      </div>
    </div>
  );
}
