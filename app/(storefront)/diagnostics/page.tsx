import type { Metadata } from "next";

import { MotionDiagnostics } from "@/components/diagnostics/motion-diagnostics";

export const metadata: Metadata = {
  title: "Motion diagnostics",
  robots: { index: false },
};

/**
 * Developer page, not part of the storefront.
 *
 * Every setting that can silently disable an animation is reported here, plus
 * live probes for the three things that actually have to work: Lenis, the
 * scroll-linked parallax, and viewport-triggered reveals.
 */
export default function DiagnosticsPage() {
  return (
    <div className="container-page pb-24 pt-24 md:pt-32">
      <header className="pb-10">
        <p className="text-eyebrow text-brand">Developer tools</p>
        <h1 className="mt-4 text-display-lg">Motion diagnostics</h1>
        <p className="mt-5 max-w-2xl text-body-lg text-muted-foreground">
          What this browser reports, and whether each piece of the motion system
          is actually running. If scroll animations look dead, the answer is on
          this page.
        </p>
      </header>

      <MotionDiagnostics />
    </div>
  );
}
