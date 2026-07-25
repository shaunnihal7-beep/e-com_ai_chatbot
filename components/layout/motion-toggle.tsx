"use client";

import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  useMotionPreference,
  type MotionPreference,
} from "@/components/providers/motion-provider";
import { useHydrated } from "@/lib/hooks/use-hydrated";

const OPTIONS: { value: MotionPreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "full", label: "Full" },
  { value: "reduced", label: "Reduced" },
];

/**
 * Three-way motion control for the footer.
 *
 * "System" follows the OS and is the default. The other two exist because the
 * OS switch is all-or-nothing: someone who disabled Windows animation effects
 * for performance still deserves the option of turning this site's motion back
 * on without changing a system-wide setting.
 */
export function MotionToggle() {
  const { preference, systemPrefersReduced, reduced, setPreference } =
    useMotionPreference();
  const hydrated = useHydrated();

  return (
    <div>
      <p className="text-eyebrow flex items-center gap-2 text-muted-foreground">
        <Sparkles className="size-3.5" strokeWidth={1.8} />
        Motion
      </p>

      <div
        role="radiogroup"
        aria-label="Animation preference"
        className="mt-3 inline-flex rounded-full border border-border p-0.5"
      >
        {OPTIONS.map((option) => {
          const active = hydrated && preference === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setPreference(option.value)}
              className={cn(
                "min-h-9 rounded-full px-3.5 text-xs font-medium transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {hydrated && (
        <p className="mt-2.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
          {reduced
            ? preference === "system"
              ? "Your device asks for reduced motion, so animations are off. Choose Full to turn them on for this site only."
              : "Animations are off."
            : systemPrefersReduced
              ? "Animations are on, overriding your device's reduced-motion setting."
              : "Animations are on."}
        </p>
      )}
    </div>
  );
}
