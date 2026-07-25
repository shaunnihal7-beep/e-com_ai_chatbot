"use client";

import Link from "next/link";
import { ChevronRight, Heart, Package, User } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { taxonomy } from "@/lib/taxonomy";
import { usePreserveScroll } from "@/lib/hooks/use-preserve-scroll";

/**
 * Full-height slide-in nav for < lg.
 *
 * Every row is at least 48px tall — a mega-menu's hover affordances do not
 * survive contact with a thumb, so the whole tree is expressed as accordions.
 */
export function MobileNav({
  open,
  onOpenChange,
  userName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string | null;
}) {
  const close = () => onOpenChange(false);
  usePreserveScroll(open);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        data-lenis-prevent
        className="h-[100dvh] max-w-sm overflow-y-auto p-0 pb-safe"
      >
        <SheetHeader className="border-b px-5 py-5">
          <SheetTitle className="font-display text-xl font-bold tracking-[-0.06em]">
            VELOCE
          </SheetTitle>
        </SheetHeader>

        <nav className="px-2 py-2">
          <Link
            href="/shop"
            onClick={close}
            className="flex min-h-12 items-center justify-between rounded-md px-3 font-display text-lg font-semibold"
          >
            All Shoes
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>

          <Accordion className="w-full">
            {taxonomy.map((node) => (
              <AccordionItem key={node.path} value={node.path} className="border-b-0">
                <AccordionTrigger className="min-h-12 px-3 font-display text-lg font-semibold hover:no-underline">
                  {node.name}
                </AccordionTrigger>
                <AccordionContent className="pb-1 pl-3">
                  <Link
                    href={`/shop/${node.path}`}
                    onClick={close}
                    className="flex min-h-11 items-center px-3 text-sm text-muted-foreground"
                  >
                    {node.allLabel}
                  </Link>

                  {node.children?.map((child) =>
                    child.children ? (
                      <Accordion key={child.path} className="w-full">
                        <AccordionItem value={child.path} className="border-b-0">
                          <AccordionTrigger className="min-h-11 px-3 text-sm font-medium hover:no-underline">
                            {child.name}
                          </AccordionTrigger>
                          <AccordionContent className="pb-1 pl-3">
                            <Link
                              href={`/shop/${child.path}`}
                              onClick={close}
                              className="flex min-h-11 items-center px-3 text-sm text-muted-foreground"
                            >
                              {child.allLabel}
                            </Link>
                            {child.children.map((leaf) => (
                              <Link
                                key={leaf.path}
                                href={`/shop/${leaf.path}`}
                                onClick={close}
                                className="flex min-h-11 items-center px-3 text-sm text-muted-foreground"
                              >
                                {leaf.name}
                              </Link>
                            ))}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    ) : (
                      <Link
                        key={child.path}
                        href={`/shop/${child.path}`}
                        onClick={close}
                        className="flex min-h-11 items-center px-3 text-sm text-muted-foreground"
                      >
                        {child.name}
                      </Link>
                    ),
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {[
            { href: "/collections", label: "Collections" },
            { href: "/blog", label: "Journal" },
            { href: "/about", label: "About" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              className="flex min-h-12 items-center justify-between rounded-md px-3 font-display text-lg font-semibold"
            >
              {item.label}
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </nav>

        <div className="mt-2 border-t px-2 py-3">
          {[
            {
              href: userName ? "/account" : "/account/login",
              label: userName ? userName : "Login / Sign Up",
              icon: User,
            },
            { href: "/account/orders", label: "My Orders", icon: Package },
            { href: "/wishlist", label: "Wishlist", icon: Heart },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              className="flex min-h-12 items-center gap-3 rounded-md px-3 text-sm"
            >
              <item.icon className="size-4 text-muted-foreground" strokeWidth={1.6} />
              {item.label}
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
