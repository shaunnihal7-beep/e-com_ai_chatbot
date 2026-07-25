import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { taxonomy } from "@/lib/taxonomy";
import { getFooterPages } from "@/lib/admin/queries/pages";
import { NewsletterForm } from "./newsletter-form";
import { MotionToggle } from "./motion-toggle";

type FooterLink = { label: string; href: string };

export async function Footer() {
  // Company-column pages are managed in the CMS (About, Contact, Privacy, …).
  let cmsPages: FooterLink[] = [];
  try {
    cmsPages = (await getFooterPages()).map((p) => ({ label: p.title, href: `/${p.slug}` }));
  } catch {
    // The footer renders on every page — a DB hiccup shouldn't take the site
    // down, so fall back to just the static links.
    cmsPages = [];
  }

  const columns: { heading: string; links: FooterLink[] }[] = [
    {
      heading: "Shop",
      links: [
        { label: "All Shoes", href: "/shop" },
        ...taxonomy.map((n) => ({ label: n.name, href: `/shop/${n.path}` })),
        { label: "Collections", href: "/collections" },
      ],
    },
    {
      heading: "Company",
      links: [
        { label: "Our Story", href: "/about" },
        { label: "Journal", href: "/blog" },
        { label: "Careers", href: "/about/careers" },
        ...cmsPages,
      ],
    },
    {
      heading: "Account",
      links: [
        { label: "Login / Sign Up", href: "/account/login" },
        { label: "My Orders", href: "/account/orders" },
        { label: "Wishlist", href: "/wishlist" },
        { label: "Cart", href: "/cart" },
      ],
    },
    {
      heading: "Support",
      links: [
        { label: "Search", href: "/search" },
        { label: "Image Credits", href: "/credits" },
      ],
    },
  ];

  return (
    <footer className="relative mt-px border-t border-border bg-surface">
      <div className="container-page py-16 md:py-24">
        {/* Newsletter */}
        <div className="grid gap-10 border-b border-border pb-14 lg:grid-cols-2 lg:gap-20">
          <div>
            <h2 className="text-display-md">
              Get there first.
            </h2>
            <p className="mt-4 max-w-md text-body-lg text-muted-foreground">
              New drops, restocks and the occasional note from the people who build
              the shoes. No more than twice a month.
            </p>
          </div>
          <div className="flex items-end">
            <NewsletterForm />
          </div>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-14 md:grid-cols-4">
          {columns.map((column) => (
            <div key={column.heading}>
              <h3 className="text-eyebrow text-muted-foreground">{column.heading}</h3>
              <ul className="mt-5 space-y-3">
                {column.links.map((link) => (
                  <li key={`${column.heading}-${link.href}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="link-sweep inline-block text-sm transition-opacity hover:opacity-70"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Accessibility preferences */}
        <div className="border-t border-border py-10">
          <MotionToggle />
        </div>

        {/* Oversized wordmark — the full-bleed sign-off. */}
        <div className="overflow-hidden border-t border-border pt-10">
          <p
            aria-hidden
            className="select-none font-display font-bold leading-[0.8] tracking-[-0.05em] text-foreground/[0.07]"
            style={{ fontSize: "clamp(4rem, 19vw, 20rem)" }}
          >
            VELOCE
          </p>
        </div>

        <div className="flex flex-col gap-4 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Veloce. A demonstration store.</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/credits" className="inline-flex items-center gap-1 hover:text-foreground">
              Image credits <ArrowUpRight className="size-3" />
            </Link>
            <Link
              href="/diagnostics"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              Motion diagnostics <ArrowUpRight className="size-3" />
            </Link>
            <span>Built with Next.js, Postgres & Ollama</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
