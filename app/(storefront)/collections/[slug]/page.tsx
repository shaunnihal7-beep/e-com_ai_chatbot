import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getCollectionBySlug, getCollections } from "@/lib/queries/collections";
import { ProductGrid } from "@/components/product/product-grid";
import { Reveal, SplitWords } from "@/components/motion/reveal";

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  const collections = await getCollections();
  return collections.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const collection = await getCollectionBySlug((await params).slug);
  if (!collection) return { title: "Not found" };
  return { title: collection.name, description: collection.description };
}

export default async function CollectionPage({ params }: { params: Promise<Params> }) {
  const collection = await getCollectionBySlug((await params).slug);
  if (!collection) notFound();

  return (
    <div className="container-page pb-24 pt-24 md:pt-32">
      <nav aria-label="Breadcrumb" className="mb-6">
        <Link href="/collections" className="text-xs text-muted-foreground hover:text-foreground">
          Collections
        </Link>
      </nav>

      <header className="pb-14">
        <p className="text-eyebrow text-brand">{collection.tagline}</p>
        <h1 className="mt-4 max-w-[14ch] text-display-lg">
          <SplitWords text={collection.name} />
        </h1>
        <Reveal delay={0.15} y={16}>
          <p className="mt-5 max-w-2xl text-body-lg text-muted-foreground">
            {collection.description}
          </p>
        </Reveal>
      </header>

      <ProductGrid products={collection.products} />
    </div>
  );
}
