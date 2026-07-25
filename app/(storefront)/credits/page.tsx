import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";


import { Reveal, SplitWords } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Image Credits",
  description: "Attribution for the photography used across this demonstration store.",
};

type Credit = {
  title: string;
  artist: string;
  license: string;
  descriptionUrl: string;
};

/**
 * Commons images are CC-licensed and require attribution. `npm run images`
 * records the artist and licence for every plate it downloads; this page is
 * where that obligation is discharged.
 */
function loadCredits(): Credit[] {
  const file = path.join(process.cwd(), "scripts", "generated", "credits.json");

  let raw: Record<string, Credit>;
  try {
    // `npm run images` rewrites this file. Reading it mid-write yields
    // truncated JSON — an attribution list is never worth a 500.
    raw = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, Credit>;
  } catch {
    return [];
  }

  // One entry per source file — the same photo can back several colourways.
  const unique = new Map<string, Credit>();
  for (const credit of Object.values(raw)) {
    if (credit?.title) unique.set(credit.title, credit);
  }

  return [...unique.values()].sort((a, b) => a.title.localeCompare(b.title));
}

export default function CreditsPage() {
  const credits = loadCredits();

  return (
    <div className="container-page pb-24 pt-24 md:pt-32">
      <header className="pb-12">
        <p className="text-eyebrow text-brand">Attribution</p>
        <h1 className="mt-4 text-display-lg">
          <SplitWords text="Image credits" />
        </h1>
        <Reveal delay={0.15} y={16}>
          <div className="mt-6 max-w-2xl space-y-4 text-body-lg text-muted-foreground">
            <p>
              Veloce is a fictional brand built as a demonstration. The product
              photography is real Nike footwear sourced from Wikimedia Commons under
              open licences, normalised into a consistent studio plate.
            </p>
            <p>
              Nike is a trademark of Nike, Inc., which has no connection to this
              project. For any commercial use, this imagery would be replaced with
              original photography.
            </p>
          </div>
        </Reveal>
      </header>

      {credits.length === 0 ? (
        <p className="text-muted-foreground">
          No credits recorded yet — run <code className="font-mono">npm run images</code>.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {credits.length} source images.
          </p>

          <ul className="mt-8 divide-y divide-border border-y border-border">
            {credits.map((credit) => (
              <li
                key={credit.title}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4"
              >
                <div className="min-w-0 flex-1">
                  <a
                    href={credit.descriptionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm underline underline-offset-4"
                  >
                    {credit.title}
                  </a>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    by {credit.artist}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px]">
                  {credit.license}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
