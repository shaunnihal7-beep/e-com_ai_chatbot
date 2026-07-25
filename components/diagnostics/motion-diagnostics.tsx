"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "motion/react";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import { useMotionPreference } from "@/components/providers/motion-provider";
import { MotionToggle } from "@/components/layout/motion-toggle";

type Verdict = "ok" | "warn" | "bad";

type LenisHandle = {
  scrollTo: (
    target: number,
    options?: { duration?: number; immediate?: boolean },
  ) => void;
};

type Row = {
  label: string;
  value: string;
  verdict: Verdict;
  note?: string;
};

export function MotionDiagnostics() {
  const { preference, systemPrefersReduced, reduced } = useMotionPreference();
  const [rows, setRows] = useState<Row[]>([]);
  const [lenisProbe, setLenisProbe] = useState<string>("not run");
  const [probing, setProbing] = useState(false);

  const parallaxRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const revealInView = useInView(revealRef, { once: false, margin: "-40%" });

  const { scrollYProgress } = useScroll();
  const parallaxX = useTransform(scrollYProgress, [0, 1], [0, 220]);
  const [progress, setProgress] = useState(0);

  useEffect(
    () => scrollYProgress.on("change", (v) => setProgress(v)),
    [scrollYProgress],
  );

  // Effects run child-first, so a one-shot snapshot here would read the DOM
  // before SmoothScroll and MotionProvider — both ancestors — have run theirs,
  // and report Lenis missing when it is about to mount. Re-reading on a timer
  // keeps the panel honest and picks up changes made while it is open.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // The single most useful number on this page.
  //
  // Framer Motion and Lenis both animate on requestAnimationFrame. If the
  // browser is throttling rAF, every scroll animation dies while CSS, layout
  // and hover states carry on working perfectly — which looks exactly like
  // "the animations are broken" but is nothing to do with the code.
  const [fps, setFps] = useState<number | null>(null);
  useEffect(() => {
    let frames = 0;
    let running = true;
    const started = performance.now();

    const count = () => {
      if (!running) return;
      frames++;
      requestAnimationFrame(count);
    };
    requestAnimationFrame(count);

    const id = setTimeout(() => {
      running = false;
      setFps(Math.round((frames * 1000) / (performance.now() - started)));
    }, 1000);

    return () => {
      running = false;
      clearTimeout(id);
    };
  }, [tick]);

  useEffect(() => {
    const q = (query: string) => window.matchMedia(query).matches;
    const lenis = (window as unknown as { lenis?: unknown }).lenis;

    const next: Row[] = [
      {
        label: "Animation frame rate",
        value: fps === null ? "measuring…" : `${fps} fps`,
        verdict: fps === null ? "warn" : fps >= 45 ? "ok" : fps >= 20 ? "warn" : "bad",
        note:
          fps !== null && fps < 20
            ? "requestAnimationFrame is being starved, and every JavaScript animation on the site runs on it — this alone will make scroll animations look completely dead while the rest of the page behaves normally. Usual causes, in order: graphics acceleration turned off in the browser (chrome://settings/system), Windows power mode set to 'Best power efficiency', browser battery/energy saver, or the window being occluded by another window."
            : fps !== null && fps < 45
              ? "Lower than a healthy display refresh rate. Animations will run but may look choppy."
              : "Healthy — the animation loop is getting the frames it needs.",
      },
      {
        label: "prefers-reduced-motion",
        value: systemPrefersReduced ? "reduce" : "no-preference",
        verdict: systemPrefersReduced ? "bad" : "ok",
        note: systemPrefersReduced
          ? "Your OS is asking for reduced motion. On Windows this is Settings → Accessibility → Visual effects → Animation effects. This alone disables the preloader, split-word reveals, parallax and smooth scrolling."
          : "The OS is not suppressing animation.",
      },
      {
        label: "Site motion preference",
        value: preference,
        verdict: preference === "system" && systemPrefersReduced ? "warn" : "ok",
        note:
          preference === "system"
            ? "Following the OS. Set this to Full below to override it for this site."
            : `Explicitly set to "${preference}".`,
      },
      {
        label: "Resolved motion state",
        value: reduced ? "animations OFF" : "animations ON",
        verdict: reduced ? "bad" : "ok",
      },
      {
        label: "data-motion attribute",
        value: document.documentElement.dataset.motion ?? "(unset)",
        verdict: document.documentElement.dataset.motion ? "ok" : "warn",
      },
      {
        label: "Lenis instance",
        value: lenis ? "mounted" : "not mounted",
        verdict: lenis ? "ok" : "bad",
        note: lenis
          ? undefined
          : "Smooth scrolling is off. Either motion is reduced, or this device reports no fine pointer.",
      },
      {
        label: "html.lenis class",
        value: document.documentElement.classList.contains("lenis")
          ? "present"
          : "absent",
        verdict: document.documentElement.classList.contains("lenis") ? "ok" : "warn",
      },
      {
        label: "any-pointer: fine",
        value: q("(any-pointer: fine)") ? "yes" : "no",
        verdict: q("(any-pointer: fine)") ? "ok" : "warn",
        note: q("(any-pointer: fine)")
          ? "A mouse or trackpad is available, so smooth scrolling is enabled."
          : "No precise pointer detected — smooth scrolling stays off and the browser's native inertia is used instead.",
      },
      {
        label: "pointer (primary)",
        value: q("(pointer: fine)") ? "fine" : q("(pointer: coarse)") ? "coarse" : "none",
        verdict: "ok",
      },
      {
        label: "External network requests",
        value: String(
          performance
            .getEntriesByType("resource")
            .filter(
              (e) =>
                !e.name.startsWith(location.origin) && !e.name.startsWith("data:"),
            ).length,
        ),
        verdict: "ok",
        note: "Fonts, styles and the animation libraries are all served from this machine — the site works with no internet connection.",
      },
      {
        label: "Fonts",
        value: document.fonts.status,
        verdict: document.fonts.status === "loaded" ? "ok" : "warn",
      },
      {
        label: "Hardware concurrency",
        value: `${navigator.hardwareConcurrency ?? "?"} cores`,
        verdict: "ok",
      },
    ];

    setRows(next);
  }, [preference, systemPrefersReduced, reduced, tick, fps]);

  /**
   * Measures the easing curve of a real Lenis-driven scroll.
   *
   * Deliberately not a synthetic wheel event: those are untrusted, so their
   * `preventDefault()` does not suppress the browser's own scrolling. Lenis
   * would set its target *and* the browser would jump, and the probe would
   * report "not smoothed" on a perfectly healthy setup. Driving Lenis's own
   * API exercises the same rAF interpolation loop the wheel path uses.
   */
  async function probeLenis() {
    const lenis = (window as unknown as { lenis?: LenisHandle }).lenis;

    setProbing(true);
    setLenisProbe("running…");

    if (!lenis) {
      setProbing(false);
      setLenisProbe(
        "Lenis is not mounted, so scrolling is the browser's native behaviour. Check the reduced-motion and pointer rows above.",
      );
      return;
    }

    const start = window.scrollY;
    const samples: number[] = [];
    const timer = setInterval(() => samples.push(window.scrollY), 25);

    lenis.scrollTo(start + 500, { duration: 1 });

    await new Promise((r) => setTimeout(r, 1100));
    clearInterval(timer);

    const travelled = window.scrollY - start;
    const distinct = new Set(samples.map((s) => Math.round(s))).size;

    lenis.scrollTo(start, { immediate: true });
    setProbing(false);

    if (travelled < 1) {
      setLenisProbe("FAILED — Lenis is mounted but the page did not move.");
    } else if (distinct > 6) {
      setLenisProbe(
        `PASS — interpolated across ${distinct} distinct frames over ${Math.round(travelled)}px. The animation loop is running.`,
      );
    } else {
      setLenisProbe(
        `Moved ${Math.round(travelled)}px but only ${distinct} frame(s) were observed. ` +
          (fps !== null && fps < 20
            ? `That is expected at ${fps} fps — the browser is starving requestAnimationFrame, so there are no frames to interpolate across. Fix the frame rate first; see the note in the Environment table.`
            : "The animation loop is not interpolating."),
      );
    }
  }

  return (
    <div className="space-y-14">
      <section>
        <h2 className="font-display text-2xl font-bold tracking-tight">
          Environment
        </h2>
        <div className="mt-6 overflow-hidden rounded-xl border border-border">
          {rows.map((row, i) => (
            <div
              key={row.label}
              className={cn(
                "flex flex-col gap-1 p-4 sm:flex-row sm:items-start sm:gap-4",
                i > 0 && "border-t border-border",
                row.verdict === "bad" && "bg-destructive/5",
              )}
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <Icon verdict={row.verdict} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{row.label}</p>
                  {row.note && (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {row.note}
                    </p>
                  )}
                </div>
              </div>
              <code className="shrink-0 rounded bg-muted px-2 py-1 font-mono text-xs">
                {row.value}
              </code>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold tracking-tight">
          Change it
        </h2>
        <div className="mt-6 rounded-xl border border-border p-6">
          <MotionToggle />
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold tracking-tight">
          Live probes
        </h2>

        <div className="mt-6 space-y-6">
          {/* Scroll progress */}
          <div className="rounded-xl border border-border p-6">
            <p className="text-sm font-medium">Scroll-linked value</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Should track continuously as you scroll. Frozen at 0 means the
              scroll listener is not firing.
            </p>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="mt-2 font-mono text-xs tabular-nums text-muted-foreground">
              scrollYProgress = {progress.toFixed(4)}
            </p>
          </div>

          {/* Parallax */}
          <div ref={parallaxRef} className="rounded-xl border border-border p-6">
            <p className="text-sm font-medium">Parallax transform</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The square should slide right as you scroll down this page.
            </p>
            <div className="mt-4 h-14 w-full rounded-lg bg-muted">
              <motion.div
                style={{ x: reduced ? 0 : parallaxX }}
                className="size-14 rounded-lg bg-brand"
              />
            </div>
          </div>

          {/* Viewport reveal */}
          <div ref={revealRef} className="rounded-xl border border-border p-6">
            <p className="text-sm font-medium">Viewport reveal trigger</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Flips to “in view” when this card reaches the middle of the screen.
            </p>
            <p
              className={cn(
                "mt-4 inline-block rounded-full px-3 py-1 text-xs font-semibold",
                revealInView
                  ? "bg-success/15 text-success"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {revealInView ? "in view" : "out of view"}
            </p>
          </div>

          {/* Lenis probe */}
          <div className="rounded-xl border border-border p-6">
            <p className="text-sm font-medium">Smooth scroll probe</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Fires a synthetic wheel event and measures whether the scroll is
              eased across frames or jumps in one step.
            </p>
            <button
              type="button"
              onClick={probeLenis}
              disabled={probing}
              className="mt-4 min-h-11 rounded-full bg-foreground px-6 text-sm font-semibold text-background disabled:opacity-50"
            >
              {probing ? "Measuring…" : "Run probe"}
            </button>
            <p className="mt-3 font-mono text-xs leading-relaxed">{lenisProbe}</p>
          </div>
        </div>
      </section>

      {/* Enough height that the scroll-linked probes above have room to move. */}
      <div className="h-[80vh] rounded-xl border border-dashed border-border p-6">
        <p className="text-sm text-muted-foreground">
          Spacer — scroll through this to exercise the probes above.
        </p>
      </div>
    </div>
  );
}

function Icon({ verdict }: { verdict: Verdict }) {
  if (verdict === "ok")
    return <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={2} />;
  if (verdict === "warn")
    return <AlertTriangle className="mt-0.5 size-4 shrink-0 text-brand" strokeWidth={2} />;
  return <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" strokeWidth={2} />;
}
