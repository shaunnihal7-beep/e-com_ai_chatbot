import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Page scaffolding                                                    */
/* ------------------------------------------------------------------ */

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-background", className)}>
      {title ? (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="font-display text-sm font-semibold">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action}
        </header>
      ) : null}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-12 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stats                                                               */
/* ------------------------------------------------------------------ */

export function StatCard({
  label,
  value,
  hint,
  change,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  /** Percent change vs the previous period. Null renders no comparison at all. */
  change?: number | null;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{value}</p>

      <div className="mt-1 flex items-center gap-1.5 text-xs">
        {typeof change === "number" ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium tabular-nums",
              change > 0 && "text-success",
              change < 0 && "text-destructive",
              change === 0 && "text-muted-foreground",
            )}
          >
            {change > 0 ? (
              <ArrowUp className="size-3" aria-hidden />
            ) : change < 0 ? (
              <ArrowDown className="size-3" aria-hidden />
            ) : null}
            {change > 0 ? "+" : ""}
            {change}%
          </span>
        ) : null}
        {hint ? <span className="text-muted-foreground">{hint}</span> : null}
      </div>
    </>
  );

  const className =
    "rounded-xl border border-border bg-background p-4 block" +
    (href ? " hover:border-foreground/30" : "");

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<string, string> = {
  published: "bg-success/10 text-success",
  approved: "bg-success/10 text-success",
  delivered: "bg-success/10 text-success",
  draft: "bg-muted text-muted-foreground",
  pending: "bg-brand-muted text-brand",
  processing: "bg-brand-muted text-brand",
  confirmed: "bg-brand-muted text-brand",
  shipped: "bg-brand-muted text-brand",
  archived: "bg-muted text-muted-foreground",
  rejected: "bg-destructive/10 text-destructive",
  cancelled: "bg-destructive/10 text-destructive",
  refunded: "bg-destructive/10 text-destructive",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        STATUS_STYLES[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {status}
    </span>
  );
}

/** Stock level rendered as a word, not just a number. */
export function StockBadge({ stock, threshold }: { stock: number; threshold: number }) {
  const tone =
    stock === 0
      ? "bg-destructive/10 text-destructive"
      : stock <= threshold
        ? "bg-brand-muted text-brand"
        : "bg-muted text-muted-foreground";

  const label = stock === 0 ? "Out of stock" : stock <= threshold ? `Low · ${stock}` : `${stock}`;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
        tone,
      )}
    >
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */

export function TableShell({ children }: { children: ReactNode }) {
  // Wide tables scroll inside their own container so the page body never does.
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-background">
      <table className="w-full min-w-[42rem] text-sm">{children}</table>
    </div>
  );
}

export function Th({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-border px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <td className={cn("border-b border-border px-4 py-3 align-middle", className)}>
      {children}
    </td>
  );
}
