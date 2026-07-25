import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import { getCollections } from "@/lib/queries/collections";
import { Reveal, SplitWords } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Collections",
  description: "Curated cuts of the Veloce range, grouped by intent rather than category.",
};

export default async function CollectionsPage() {
  const collections = await getCollections();

  return (
    <div className="container-page pb-24 pt-24 md:pt-32">
      <header className="pb-14">
        <p className="text-eyebrow text-brand">Curated</p>
        <h1 className="mt-4 text-display-lg">
          <SplitWords text="Collections" />
        </h1>
        <Reveal delay={0.15} y={16}>
          <p className="mt-5 max-w-xl text-body-lg text-muted-foreground">
            Cuts of the range grouped by what they are for, not by where they sit in
            the catalogue.
          </p>
        </Reveal>
      </header>

      <div className="space-y-4">
        {collections.map((collection, i) => {
          const image = collection.products[0]?.colors[0]?.images[0];

          return (
            <Reveal key={collection.id} delay={i * 0.08}>
              <Link
                href={`/collections/${collection.slug}`}
                className="group grid overflow-hidden rounded-xl bg-surface md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]"
              >
                <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[16rem]">
                  {image && (
                    <Image
                      src={image.url}
                      alt={image.alt}
                      fill
                      sizes="(min-width: 768px) 20rem, 100vw"
                      className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-105"
                    />
                  )}
                </div>

                <div className="flex flex-col justify-center gap-3 p-7 md:p-12">
                  <p className="text-eyebrow text-brand">{collection.tagline}</p>
                  <h2 className="text-display-md">{collection.name}</h2>
                  <p className="max-w-xl text-muted-foreground">
                    {collection.description}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {collection.products.length} products
                  </p>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
