"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { Heart, Menu, Search, ShoppingBag, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { taxonomy, type TaxonomyNode } from "@/lib/taxonomy";
import type { CategoryPreview } from "@/lib/queries/nav";
import { useCart, cartCount } from "@/lib/stores/cart";
import { useWishlist } from "@/lib/stores/wishlist";
import { ThemeToggle } from "./theme-toggle";
import { MobileNav } from "./mobile-nav";
import { SearchOverlay } from "./search-overlay";
import { useHydrated } from "@/lib/hooks/use-hydrated";

const EASE = [0.16, 1, 0.3, 1] as const;

export function HeaderClient({
  previews,
  userName,
}: {
  previews: Record<string, CategoryPreview>;
  userName: string | null;
}) {
  const pathname = usePathname();
  const { scrollY } = useScroll();

  const [hidden, setHidden] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const hydrated = useHydrated();
  const lines = useCart((s) => s.lines);
  const openCart = useCart((s) => s.open);
  const wishlistCount = useWishlist((s) => s.items.length);

  // The homepage hero sits behind a transparent header until you scroll.
  const overlayHero = pathname === "/";

  // Listing pages pin their filter bar directly beneath the header. If the
  // header retracted on scroll the bar would be left floating against the
  // content behind it, so on those routes the header stays put.
  const hasStickySubnav = pathname.startsWith("/shop");

  useMotionValueEvent(scrollY, "change", (current) => {
    const previous = scrollY.getPrevious() ?? 0;
    setAtTop(current < 24);

    // Never hide while a menu is open — it would yank the panel away.
    if (openMenu || mobileOpen || searchOpen || hasStickySubnav) {
      setHidden(false);
      return;
    }
    setHidden(current > previous && current > 160);
  });

  // Close everything on navigation, and make sure a header that was retracted
  // on the previous route comes back down on the new one.
  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
    setSearchOpen(false);
    setHidden(false);
  }, [pathname]);

  const transparent = overlayHero && atTop && !openMenu;
  const count = hydrated ? cartCount(lines) : 0;

  return (
    <>
      <motion.header
        initial={false}
        animate={{ y: hidden ? "-100%" : 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className={cn(
          "fixed inset-x-0 top-0 z-50",
          !transparent && "border-b border-border/70",
          transparent ? "text-white" : "glass",
        )}
        onMouseLeave={() => setOpenMenu(null)}
      >
        <div className="container-page">
          <div className="flex h-16 items-center justify-between gap-4 md:h-20">
            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="-ml-2 flex size-11 items-center justify-center lg:hidden"
            >
              <Menu className="size-5" strokeWidth={1.6} />
            </button>

            {/* Wordmark */}
            <Link
              href="/"
              aria-label="Veloce home"
              className="font-display text-xl font-bold tracking-[-0.06em] lg:text-2xl"
            >
              VELOCE
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center">
              <ul className="flex items-center gap-9">
                <li onMouseEnter={() => setOpenMenu("shop")}>
                  <Link
                    href="/shop"
                    className={cn(
                      "text-eyebrow py-6 transition-opacity hover:opacity-60",
                      openMenu === "shop" && "opacity-60",
                    )}
                  >
                    Shop
                  </Link>
                </li>
                {[
                  { href: "/collections", label: "Collections" },
                  { href: "/blog", label: "Journal" },
                  { href: "/about", label: "About" },
                ].map((item) => (
                  <li key={item.href} onMouseEnter={() => setOpenMenu(null)}>
                    <Link
                      href={item.href}
                      className="text-eyebrow py-6 transition-opacity hover:opacity-60"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Utilities */}
            <div className="flex items-center gap-0.5 md:gap-1">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
                className="flex size-11 items-center justify-center transition-opacity hover:opacity-60"
              >
                <Search className="size-[18px]" strokeWidth={1.6} />
              </button>

              <Link
                href="/wishlist"
                aria-label={`Wishlist, ${wishlistCount} items`}
                className="relative hidden size-11 items-center justify-center transition-opacity hover:opacity-60 sm:flex"
              >
                <Heart className="size-[18px]" strokeWidth={1.6} />
                {hydrated && wishlistCount > 0 && <Dot />}
              </Link>

              <Link
                href={userName ? "/account" : "/account/login"}
                aria-label={userName ? "Account" : "Sign in"}
                className="hidden size-11 items-center justify-center transition-opacity hover:opacity-60 sm:flex"
              >
                <User className="size-[18px]" strokeWidth={1.6} />
              </Link>

              <ThemeToggle />

              <button
                type="button"
                onClick={openCart}
                aria-label={`Cart, ${count} items`}
                className="relative flex size-11 items-center justify-center transition-opacity hover:opacity-60"
              >
                <ShoppingBag className="size-[18px]" strokeWidth={1.6} />
                <AnimatePresence>
                  {count > 0 && (
                    <motion.span
                      key={count}
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.4, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 520, damping: 22 }}
                      className="absolute right-1 top-1.5 grid min-w-[17px] place-items-center rounded-full bg-brand px-1 text-[10px] font-bold leading-[17px] text-brand-foreground"
                    >
                      {count}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        </div>

        {/* Mega menu */}
        <AnimatePresence>
          {openMenu === "shop" && (
            <MegaMenu previews={previews} onClose={() => setOpenMenu(null)} />
          )}
        </AnimatePresence>
      </motion.header>

      <MobileNav open={mobileOpen} onOpenChange={setMobileOpen} userName={userName} />
      <SearchOverlay open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}

function Dot() {
  return (
    <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-brand" />
  );
}

/* ------------------------------------------------------------------ */
/* Mega menu                                                           */
/* ------------------------------------------------------------------ */

function MegaMenu({
  previews,
  onClose,
}: {
  previews: Record<string, CategoryPreview>;
  onClose: () => void;
}) {
  // The preview pane follows whichever link is hovered, defaulting to Sports.
  const [hovered, setHovered] = useState<string>("sports");
  const preview = previews[hovered] ?? previews["sports"];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: EASE }}
      className="absolute inset-x-0 top-full hidden border-t border-border/70 bg-background text-foreground shadow-[0_24px_60px_-32px_rgba(0,0,0,0.4)] lg:block"
    >
      <div className="container-page grid grid-cols-[1fr_1fr_1fr_minmax(0,22rem)] gap-10 py-12">
        <div>
          <Link
            href="/shop"
            onClick={onClose}
            onMouseEnter={() => setHovered("sports")}
            className="text-eyebrow text-muted-foreground transition-colors hover:text-foreground"
          >
            All Shoes
          </Link>
        </div>

        {taxonomy.map((node) => (
          <MegaColumn key={node.path} node={node} onHover={setHovered} onClose={onClose} />
        ))}

        {/* Preview pane */}
        <div className="relative">
          <AnimatePresence mode="wait">
            {preview?.image && (
              <motion.div
                key={preview.path}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-surface"
              >
                <Image
                  src={preview.image}
                  alt={preview.productName}
                  fill
                  sizes="22rem"
                  className="object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 text-white">
                  <p className="text-eyebrow opacity-80">{preview.name}</p>
                  <p className="mt-1 font-display text-lg font-semibold">
                    {preview.productName}
                  </p>
                  <p className="mt-0.5 text-xs opacity-70">
                    {preview.count} {preview.count === 1 ? "style" : "styles"}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function MegaColumn({
  node,
  onHover,
  onClose,
}: {
  node: TaxonomyNode;
  onHover: (path: string) => void;
  onClose: () => void;
}) {
  return (
    <div>
      <Link
        href={`/shop/${node.path}`}
        onClick={onClose}
        onMouseEnter={() => onHover(node.path)}
        className="font-display text-lg font-semibold tracking-tight transition-opacity hover:opacity-60"
      >
        {node.name}
      </Link>

      <ul className="mt-4 space-y-2.5">
        <li>
          <Link
            href={`/shop/${node.path}`}
            onClick={onClose}
            onMouseEnter={() => onHover(node.path)}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {node.allLabel}
          </Link>
        </li>
        {node.children?.map((child) => (
          <li key={child.path}>
            <Link
              href={`/shop/${child.path}`}
              onClick={onClose}
              onMouseEnter={() => onHover(child.path)}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {child.name}
            </Link>
            {child.children && (
              <ul className="ml-3 mt-2 space-y-2 border-l border-border pl-3">
                {child.children.map((leaf) => (
                  <li key={leaf.path}>
                    <Link
                      href={`/shop/${leaf.path}`}
                      onClick={onClose}
                      onMouseEnter={() => onHover(leaf.path)}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {leaf.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
