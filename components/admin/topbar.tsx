import { LogOut } from "lucide-react";

import { adminLogoutAction } from "@/app/actions/admin/auth";
import type { AdminSession } from "@/lib/admin/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function AdminTopbar({ session }: { session: AdminSession }) {
  const initials = session.name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-end gap-3 border-b border-border bg-background/95 px-4 backdrop-blur md:px-8">
      <ThemeToggle />

      <div className="flex items-center gap-2.5 border-l border-border pl-3">
        <div
          className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold"
          aria-hidden
        >
          {initials}
        </div>
        <div className="hidden leading-tight sm:block">
          <p className="text-sm font-medium">{session.name}</p>
          <p className="text-xs text-muted-foreground capitalize">{session.role}</p>
        </div>
      </div>

      <form action={adminLogoutAction}>
        <Button type="submit" variant="ghost" size="sm" title="Sign out">
          <LogOut className="size-4" aria-hidden />
          <span className="sr-only sm:not-sr-only">Sign out</span>
        </Button>
      </form>
    </header>
  );
}
