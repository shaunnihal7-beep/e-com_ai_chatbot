import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";

import "./globals.css";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Tighter, more condensed cousin of Inter — carries the display sizes without
// looking like the body copy scaled up.
const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: {
    default: "Veloce — Performance Footwear",
    template: "%s — Veloce",
  },
  description:
    "Running, training, football and basketball footwear engineered around a single question: what does the athlete need at minute ninety?",
  openGraph: {
    title: "Veloce — Performance Footwear",
    description: "Engineered for the clock, not the catalogue.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  // Pinch-zoom stays available; disabling it fails WCAG 1.4.4.
  maximumScale: 5,
};

/**
 * Deliberately thin. Everything the storefront needs — header, footer, smooth
 * scrolling, page transitions — lives in app/(storefront)/layout.tsx, so the
 * admin group can opt out of all of it. The CMS renders no motion at all.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // Font variables must live on <html>: globals.css sets font-family on the
    // html element, and a var defined on <body> is not visible to its parent —
    // the declaration would be invalid and everything would fall back to serif.
    <html
      lang="en"
      className={`${inter.variable} ${interTight.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="bottom-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
