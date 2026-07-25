import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";

import { Reveal, SplitWords } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Careers",
  description: "Open roles at Veloce — design, materials, engineering and retail.",
};

const ROLES = [
  {
    title: "Senior Footwear Designer — Football",
    team: "Product Design",
    location: "London, UK",
    type: "Full time",
    body: "Own the soleplate roadmap across FG and SG. You will spend as much time on wet pitches as in CAD.",
  },
  {
    title: "Materials Scientist — Foams",
    team: "Innovation",
    location: "Porto, Portugal",
    type: "Full time",
    body: "Supercritical foaming, cell structure, and the gap between what a compound does on day one and day four hundred.",
  },
  {
    title: "Biomechanics Researcher",
    team: "Innovation",
    location: "London, UK",
    type: "Full time",
    body: "Run the force-plate lab. Design protocols we can publish, and tell us when a claim does not hold.",
  },
  {
    title: "Senior Frontend Engineer",
    team: "Digital",
    location: "Remote (UK/EU)",
    type: "Full time",
    body: "Own this storefront. Performance budgets are treated as requirements, not aspirations.",
  },
  {
    title: "Retail Lead — Flagship",
    team: "Retail",
    location: "London, UK",
    type: "Full time",
    body: "Run the Shoreditch store and the gait-analysis service inside it. Retail experience matters less than coaching experience.",
  },
  {
    title: "Supply Chain Analyst",
    team: "Operations",
    location: "Porto, Portugal",
    type: "Contract",
    body: "Trace every component to a named supplier and hold them to the audit schedule.",
  },
];

const VALUES = [
  {
    title: "Show the number",
    body: "Opinions are welcome in the room. They do not make it onto the product page without evidence behind them.",
  },
  {
    title: "Argue early",
    body: "The cheapest time to kill a bad idea is before the tooling is cut. We would rather have the fight in week two.",
  },
  {
    title: "Own the returns pile",
    body: "Everyone in the company reads the returns data. It is the most honest feedback we get.",
  },
];

export default function CareersPage() {
  return (
    <>
      <section className="container-page pb-16 pt-28 md:pt-40">
        <nav aria-label="Breadcrumb" className="mb-6">
          <Link href="/about" className="text-xs text-muted-foreground hover:text-foreground">
            About
          </Link>
        </nav>

        <p className="text-eyebrow text-brand">Careers</p>
        <h1 className="mt-6 max-w-[14ch] text-display-xl">
          <SplitWords text="Come argue about foam." />
        </h1>
        <Reveal delay={0.3} y={20}>
          <p className="mt-8 max-w-2xl text-body-lg text-muted-foreground">
            We are a small team split between London and Porto. Everyone here has
            changed their mind about something important in the last year.
          </p>
        </Reveal>
      </section>

      {/* Values */}
      <section className="border-t border-border">
        <div className="container-page section-y">
          <div className="grid gap-10 md:grid-cols-3 md:gap-8">
            {VALUES.map((value, i) => (
              <Reveal key={value.title} delay={i * 0.08}>
                <h2 className="font-display text-xl font-bold tracking-tight">
                  {value.title}
                </h2>
                <p className="mt-3 leading-relaxed text-muted-foreground">{value.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="border-t border-border">
        <div className="container-page section-y">
          <Reveal>
            <h2 className="text-display-md">Open roles</h2>
            <p className="mt-3 text-muted-foreground">
              {ROLES.length} positions currently open.
            </p>
          </Reveal>

          <ul className="mt-12 border-t border-border">
            {ROLES.map((role, i) => (
              <Reveal key={role.title} delay={Math.min(i, 5) * 0.05} as="li">
                <div className="group flex flex-col gap-4 border-b border-border py-7 md:flex-row md:items-center md:gap-8">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h3 className="font-display text-lg font-bold tracking-tight">
                        {role.title}
                      </h3>
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium">
                        {role.team}
                      </span>
                    </div>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                      {role.body}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-6">
                    <div className="text-xs text-muted-foreground">
                      <p className="flex items-center gap-1.5">
                        <MapPin className="size-3" strokeWidth={1.8} />
                        {role.location}
                      </p>
                      <p className="mt-1">{role.type}</p>
                    </div>

                    <span className="grid size-11 shrink-0 place-items-center rounded-full border border-border transition-colors group-hover:border-foreground group-hover:bg-foreground group-hover:text-background">
                      <ArrowUpRight className="size-4" strokeWidth={1.8} />
                    </span>
                  </div>
                </div>
              </Reveal>
            ))}
          </ul>

          <Reveal delay={0.1}>
            <p className="mt-12 text-sm text-muted-foreground">
              Nothing that fits? Write to{" "}
              <span className="font-medium text-foreground">careers@veloce.com</span> and
              tell us what you would fix first.
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
