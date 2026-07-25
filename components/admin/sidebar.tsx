"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  Boxes,
  FileText,
  LayoutDashboard,
  Menu,
  Package,
  ShoppingCart,
  Star,
  Tags,
  Users,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Count rendered as a pill on the right of the row. */
  badge?: number;
  /** Marks the badge as needing attention rather than merely informational. */
  alert?: boolean;
};

export function AdminSidebar({
  pendingReviews,
  stockAlerts,
}: {
  pendingReviews: number;
  stockAlerts: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const groups: { title: string; items: NavItem[] }[] = [
    {
      title: "Overview",
      items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
    },
    {
      title: "Commerce",
      items: [
        { href: "/admin/products", label: "Products", icon: Package },
        { href: "/admin/inventory", label: "Inventory", icon: Boxes, badge: stockAlerts, alert: true },
        { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
        { href: "/admin/customers", label: "Customers", icon: Users },
        { href: "/admin/reviews", label: "Reviews", icon: Star, badge: pendingReviews, alert: true },
      ],
    },
    {
      title: "Content",
      items: [
        { href: "/admin/blog", label: "Blog posts", icon: BookOpen },
        { href: "/admin/blog/taxonomy", label: "Categories & tags", icon: Tags },
        { href: "/admin/pages", label: "Pages", icon: FileText },
      ],
    },
  ];

  /**
   * Longest match wins, so /admin/blog/taxonomy highlights "Categories & tags"
   * rather than lighting up "Blog posts" as well. /admin only ever matches
   * itself, since every other route is nested under it.
   */
  const activeHref = groups
    .flatMap((group) => group.items.map((item) => item.href))
    .filter((href) =>
      href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`),
    )
    .sort((a, b) => b.length - a.length)[0];

  const isActive = (href: string) => href === activeHref;

  const nav = (
    <nav className="flex flex-col gap-6 p-4">
      <Link
        href="/admin"
        onClick={() => setOpen(false)}
        className="px-2 py-1 font-display text-lg font-semibold tracking-tight"
      >
        VELOCE
        <span className="ml-1.5 align-middle text-[0.65rem] font-medium tracking-widest text-muted-foreground">
          CMS
        </span>
      </Link>

      {groups.map((group) => (
        <div key={group.title}>
          <p className="px-2 pb-2 text-[0.7rem] font-semibold tracking-wider text-muted-foreground uppercase">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm",
                      active
                        ? "bg-foreground text-background font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    <span className="truncate">{item.label}</span>

                    {item.badge ? (
                      <span
                        className={cn(
                          "ml-auto rounded-full px-1.5 py-0.5 text-[0.7rem] font-medium tabular-nums",
                          item.alert && !active
                            ? "bg-brand-muted text-brand"
                            : active
                              ? "bg-background/20 text-background"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="mt-auto px-2 pt-4">
        <Link
          href="/"
          target="_blank"
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          View storefront ↗
        </Link>
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile trigger — the sidebar collapses below lg. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-3 left-3 z-50 flex size-9 items-center justify-center rounded-lg border border-border bg-background lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-4" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          />
          <div className="relative flex h-full w-64 flex-col overflow-y-auto border-r border-border bg-background">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-3 flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close navigation"
            >
              <X className="size-4" />
            </button>
            {nav}
          </div>
        </div>
      ) : null}

      <aside className="hidden w-60 shrink-0 border-r border-border bg-background lg:flex lg:flex-col">
        <div className="sticky top-0 flex max-h-screen flex-col overflow-y-auto">{nav}</div>
      </aside>
    </>
  );
}
