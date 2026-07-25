"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * PDP gallery.
 *
 * Desktop: thumbnail rail + a main image with cursor-tracked zoom.
 * Mobile: a native scroll-snap carousel — no JS gesture handling, so it
 * inherits the browser's own momentum and never fights the page scroll.
 */
export function ProductGallery({
  images,
  productName,
}: {
  images: { url: string; alt: string }[];
  productName: string;
}) {
  const [active, setActive] = useState(0);
  const [slide, setSlide] = useState(0);
  const [zooming, setZooming] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const frameRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  const current = images[active] ?? images[0];

  /** Keeps the mobile progress dots in step with the scroll-snap rail. */
  function handleRailScroll() {
    const rail = railRef.current;
    if (!rail) return;
    const first = rail.firstElementChild as HTMLElement | null;
    if (!first) return;
    const step = first.offsetWidth + 8; // slide + gap-2
    setSlide(Math.round(rail.scrollLeft / step));
  }

  function handleMove(event: React.MouseEvent) {
    if (!frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    setOrigin({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  }

  if (images.length === 0) return null;

  return (
    <div>
      {/* ---- Mobile carousel ---- */}
      <div className="lg:hidden">
        <div
          ref={railRef}
          onScroll={handleRailScroll}
          data-lenis-prevent
          className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5"
        >
          {images.map((image, i) => (
            <div
              key={image.url}
              className="relative aspect-[4/5] w-[85vw] shrink-0 snap-center overflow-hidden rounded-lg bg-surface"
            >
              <Image
                src={image.url}
                alt={image.alt}
                fill
                priority={i === 0}
                sizes="85vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>

        {images.length > 1 && (
          <div className="mt-3 flex justify-center gap-1.5">
            {images.map((image, i) => (
              <span
                key={image.url}
                className={cn(
                  "h-1 rounded-full bg-foreground transition-all",
                  i === slide ? "w-6 opacity-100" : "w-1 opacity-25",
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* ---- Desktop ---- */}
      <div className="hidden gap-4 lg:flex">
        {images.length > 1 && (
          <div className="flex w-20 shrink-0 flex-col gap-2.5">
            {images.map((image, i) => (
              <button
                key={image.url}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`View image ${i + 1}`}
                aria-current={i === active}
                className={cn(
                  "relative aspect-[4/5] overflow-hidden rounded-md bg-surface transition-all",
                  i === active
                    ? "ring-1 ring-foreground ring-offset-2 ring-offset-background"
                    : "opacity-60 hover:opacity-100",
                )}
              >
                <Image src={image.url} alt={image.alt} fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        )}

        <div
          ref={frameRef}
          onMouseEnter={() => setZooming(true)}
          onMouseLeave={() => setZooming(false)}
          onMouseMove={handleMove}
          className="relative aspect-[4/5] flex-1 cursor-zoom-in overflow-hidden rounded-lg bg-surface"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={current.url}
              initial={{ opacity: 0, scale: 1.015 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: EASE }}
              className="absolute inset-0"
            >
              <Image
                src={current.url}
                alt={current.alt || productName}
                fill
                priority
                sizes="(min-width: 1280px) 45vw, 50vw"
                className="object-cover transition-transform duration-300 ease-out"
                style={{
                  transform: zooming ? "scale(1.75)" : "scale(1)",
                  transformOrigin: `${origin.x}% ${origin.y}%`,
                }}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
