import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Veloce CMS",
    template: "%s — Veloce CMS",
  },
  // The admin area must never be indexed, and never appear in a preview card.
  robots: { index: false, follow: false, nocache: true },
};

/**
 * `data-admin` switches on the motion-free rule in globals.css for everything
 * below it. Auth is enforced one level down, in (panel)/layout.tsx, so the
 * login page can share this wrapper without guarding itself against itself.
 */
export default function AdminRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div data-admin className="min-h-screen bg-surface text-foreground">
      {children}
    </div>
  );
}
