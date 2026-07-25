import type { Metadata } from "next";
import Image from "next/image";

import { getCategoryPreviews } from "@/lib/queries/nav";
import { Reveal, SplitWords, Stagger, StaggerItem } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button-link";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why Veloce exists, what we measure, and how the shoes are actually made.",
};

const CRAFT_STEPS = [
  {
    step: "01",
    title: "The last",
    body: "Every silhouette starts as a physical last carved to a foot scan, not a size chart. We hold four widths per sport and throw away more than we keep.",
  },
  {
    step: "02",
    title: "The midsole",
    body: "Foam is supercritically expanded in-house so we control cell structure rather than buying a compound and hoping. Each batch is drop-tested before it is cut.",
  },
  {
    step: "03",
    title: "The upper",
    body: "Knitted in one piece wherever the sport allows, so there is no seam near a flex point. Where a seam is unavoidable, it is welded rather than stitched.",
  },
  {
    step: "04",
    title: "The proof",
    body: "800 kilometres on road models, a full season on boots, before anything ships. Testers are athletes we pay, not staff we ask nicely.",
  },
];

const NUMBERS = [
  { value: "800km", label: "tested per road model" },
  { value: "4", label: "widths per last" },
  { value: "60", label: "day returns, worn or unworn" },
  { value: "2yr", label: "construction warranty" },
];

export default async function AboutPage() {
  const previews = await getCategoryPreviews();
  const storyImage = previews["sports/running"]?.image ?? "";
  const craftImage = previews["sports/football"]?.image ?? "";

  return (
    <>
      {/* Hero */}
      <section className="container-page pb-16 pt-28 md:pt-40">
        <p className="text-eyebrow text-brand">About Veloce</p>
        <h1 className="mt-6 max-w-[16ch] text-display-xl">
          <SplitWords text="We build shoes we can defend." />
        </h1>
        <Reveal delay={0.3} y={20}>
          <p className="mt-8 max-w-2xl text-body-lg text-muted-foreground">
            Not the fastest claim, not the loudest campaign. A shoe that does what we
            said it would, for as long as we said it would, or we want it back.
          </p>
        </Reveal>
      </section>

      {/* Our Story */}
      <section id="story" className="scroll-mt-24 border-t border-border">
        <div className="container-page section-y">
          <div className="grid gap-14 lg:grid-cols-2 lg:gap-24">
            <Reveal>
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-surface">
                {storyImage && (
                  <Image
                    src={storyImage}
                    alt="Veloce running shoe"
                    fill
                    sizes="(min-width: 1024px) 45vw, 100vw"
                    className="object-cover"
                  />
                )}
              </div>
            </Reveal>

            <div className="lg:py-8">
              <Reveal>
                <p className="text-eyebrow text-brand">Our story</p>
                <h2 className="mt-4 max-w-[15ch] text-display-md">
                  It started with a returns pile.
                </h2>
              </Reveal>

              <Reveal delay={0.1}>
                <div className="mt-7 space-y-5 text-body-lg text-muted-foreground">
                  <p>
                    Our founder spent six years running a running shop. The most
                    instructive part of the job was not selling shoes — it was the
                    returns pile, and the pattern in it.
                  </p>
                  <p>
                    The same models came back for the same reasons, season after season.
                    Midsoles that packed out at 300 kilometres and were marketed at 800.
                    Uppers that separated exactly where a seam crossed a flex point.
                    Soleplates scaled from a single mould, which meant they were correct
                    at precisely one size.
                  </p>
                  <p>
                    None of these were mysteries. They were known problems that nobody
                    was being held to. Veloce exists to be held to them.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section id="mission" className="noise-overlay relative scroll-mt-24 overflow-hidden bg-ink text-ink-foreground">
        <div className="container-page section-y">
          <Reveal>
            <p className="text-eyebrow text-brand">Mission</p>
            <h2 className="mt-6 max-w-[18ch] text-display-lg">
              Measure it, or don&apos;t claim it.
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="mt-8 max-w-2xl text-body-lg text-ink-foreground/60">
              Every performance claim on this site maps to a number we generated in a
              lab or on a track, using a method we will describe if you ask. Where we
              could not measure something, we left it out rather than reaching for an
              adjective.
            </p>
          </Reveal>

          <Stagger className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-4" gap={0.08}>
            {NUMBERS.map((item) => (
              <StaggerItem key={item.label}>
                <p className="font-display text-4xl font-bold tabular-nums md:text-5xl">
                  {item.value}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.14em] text-ink-foreground/50">
                  {item.label}
                </p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Craftsmanship */}
      <section id="craftsmanship" className="scroll-mt-24">
        <div className="container-page section-y">
          <Reveal>
            <p className="text-eyebrow text-brand">Craftsmanship</p>
            <h2 className="mt-4 max-w-[16ch] text-display-lg">
              Four stages, none of them skipped.
            </h2>
          </Reveal>

          <div className="mt-16 grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-20">
            <div>
              {CRAFT_STEPS.map((item, i) => (
                <Reveal key={item.step} delay={i * 0.06}>
                  <article className="border-t border-border py-9 first:border-t-0 first:pt-0">
                    <div className="flex items-baseline gap-4">
                      <span className="font-mono text-xs text-muted-foreground">
                        {item.step}
                      </span>
                      <h3 className="font-display text-2xl font-bold tracking-tight">
                        {item.title}
                      </h3>
                    </div>
                    <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
                  </article>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.1}>
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-surface lg:sticky lg:top-28">
                {craftImage && (
                  <Image
                    src={craftImage}
                    alt="Veloce construction detail"
                    fill
                    sizes="(min-width: 1024px) 26rem, 100vw"
                    className="object-cover"
                  />
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Careers CTA */}
      <section className="border-t border-border">
        <div className="container-page section-y text-center">
          <Reveal>
            <p className="text-eyebrow text-brand">Careers</p>
            <h2 className="mx-auto mt-5 max-w-[18ch] text-display-md">
              We are hiring people who argue with us.
            </h2>
            <p className="mx-auto mt-6 max-w-lg text-body-lg text-muted-foreground">
              Design, materials science, retail and engineering. If you have opinions
              about foam, we would like to hear them.
            </p>
            <ButtonLink
              className="mt-9 h-14 rounded-full px-9 text-sm font-semibold"
              href="/about/careers"
            >
              See open roles
            </ButtonLink>
          </Reveal>
        </div>
      </section>
    </>
  );
}
