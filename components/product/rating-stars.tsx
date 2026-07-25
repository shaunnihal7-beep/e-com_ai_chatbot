import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Fractional star rating. The partial star is a clipped overlay rather than a
 * rounded whole, so 4.3 and 4.7 don't render identically.
 */
export function RatingStars({
  rating,
  size = 14,
  className,
}: {
  rating: number;
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - i));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star
              className="absolute inset-0 text-muted-foreground/35"
              style={{ width: size, height: size }}
              strokeWidth={1.5}
            />
            {fill > 0 && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star
                  className="fill-current text-foreground"
                  style={{ width: size, height: size }}
                  strokeWidth={1.5}
                />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
