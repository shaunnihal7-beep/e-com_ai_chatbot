"use client";

import { useId, useState } from "react";

import { formatPrice } from "@/lib/format";
import type { RevenuePoint } from "@/lib/admin/queries/dashboard";

/**
 * Daily revenue for the selected window.
 *
 * One series, so there is no legend — the panel title names it. Colour is the
 * single brand accent; the grid and axes stay recessive. The peak day is the
 * only directly-labelled bar, and hovering any bar gives the exact figure.
 * A visually-hidden table carries the same numbers for screen readers.
 *
 * No transitions anywhere: the CMS is motion-free by design.
 */
export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const gradientId = useId();

  const max = Math.max(...data.map((d) => d.revenueCents), 1);
  const peakIndex = data.reduce(
    (best, point, i) => (point.revenueCents > data[best].revenueCents ? i : best),
    0,
  );

  const total = data.reduce((sum, d) => sum + d.revenueCents, 0);
  const active = hover === null ? null : data[hover];

  // Geometry in a fixed viewBox; the SVG scales to its container.
  const width = 720;
  const height = 200;
  const padding = { top: 16, right: 8, bottom: 22, left: 8 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const slot = plotW / data.length;
  // 2px of surface between neighbouring bars, per the spacer rule.
  const barW = Math.max(2, slot - 2);

  const gridLines = [0.25, 0.5, 0.75, 1];

  const formatDay = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-display text-2xl font-semibold tabular-nums">
            {formatPrice(total)}
          </p>
          <p className="text-xs text-muted-foreground">
            {active
              ? `${formatDay(active.date)} · ${formatPrice(active.revenueCents)} · ${active.orders} ${active.orders === 1 ? "order" : "orders"}`
              : `Across ${data.length} days`}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Peak {formatDay(data[peakIndex].date)} · {formatPrice(data[peakIndex].revenueCents)}
        </p>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height: "13rem" }}
        role="img"
        aria-label={`Daily revenue for the last ${data.length} days. Total ${formatPrice(total)}.`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        {/* Recessive gridlines — reference, not decoration. */}
        {gridLines.map((ratio) => {
          const y = padding.top + plotH - plotH * ratio;
          return (
            <line
              key={ratio}
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke="var(--border)"
              strokeWidth="1"
            />
          );
        })}

        {data.map((point, i) => {
          const barH = (point.revenueCents / max) * plotH;
          const x = padding.left + i * slot;
          const y = padding.top + plotH - barH;
          const isHovered = hover === i;

          return (
            <g key={point.date}>
              {/* Full-height hit target: easier to hover than a 3px bar. */}
              <rect
                x={x}
                y={padding.top}
                width={slot}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
              {point.revenueCents > 0 ? (
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(2, barH)}
                  rx="2"
                  fill={isHovered ? "var(--brand)" : `url(#${gradientId})`}
                  pointerEvents="none"
                />
              ) : (
                // Zero days still get a baseline tick, so gaps read as "no
                // sales" rather than as missing data.
                <rect
                  x={x}
                  y={padding.top + plotH - 1}
                  width={barW}
                  height="1"
                  fill="var(--border)"
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}

        {/* Baseline */}
        <line
          x1={padding.left}
          x2={width - padding.right}
          y1={padding.top + plotH}
          y2={padding.top + plotH}
          stroke="var(--border)"
          strokeWidth="1"
        />

        {/* Only the first, middle and last day are labelled — a label on every
            tick would be unreadable at 30 points. */}
        {[0, Math.floor(data.length / 2), data.length - 1].map((i) => (
          <text
            key={i}
            x={padding.left + i * slot + barW / 2}
            y={height - 6}
            textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
            className="fill-muted-foreground"
            style={{ fontSize: "10px" }}
          >
            {formatDay(data[i].date)}
          </text>
        ))}
      </svg>

      {/* Same numbers, available to assistive tech and to anyone who wants the
          exact figures rather than the shape. */}
      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-muted-foreground">
          View as table
        </summary>
        <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th scope="col" className="px-3 py-1.5 font-medium">Date</th>
                <th scope="col" className="px-3 py-1.5 font-medium">Orders</th>
                <th scope="col" className="px-3 py-1.5 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.map((point) => (
                <tr key={point.date} className="border-t border-border">
                  <td className="px-3 py-1.5">{formatDay(point.date)}</td>
                  <td className="px-3 py-1.5 tabular-nums">{point.orders}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {formatPrice(point.revenueCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
