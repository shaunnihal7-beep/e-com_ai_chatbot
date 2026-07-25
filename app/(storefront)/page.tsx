import { getBestSellers, getNewArrivals, getProductBySlug } from "@/lib/queries/products";
import { getFeaturedCollection } from "@/lib/queries/collections";
import { getCategoryPreviews } from "@/lib/queries/nav";
import { featuredCategoryPaths } from "@/lib/taxonomy";

import { Hero } from "@/components/home/hero";
import { FeaturedCategories } from "@/components/home/featured-categories";
import { ProductRail } from "@/components/home/product-rail";
import { PerformanceTech } from "@/components/home/performance-tech";
import { FeaturedCollection } from "@/components/home/featured-collection";
import { ProductGrid } from "@/components/product/product-grid";
import { Reveal } from "@/components/motion/reveal";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default async function HomePage() {
  const [heroProduct, previews, newArrivals, bestSellers, collection] = await Promise.all([
    getProductBySlug("tempo-elite"),
    getCategoryPreviews(),
    getNewArrivals(8),
    getBestSellers(8),
    getFeaturedCollection(),
  ]);

  const heroColor = heroProduct?.colors[0];
  const heroImage = heroColor?.images[0];

  const categories = featuredCategoryPaths
    .map((path) => previews[path])
    .filter(Boolean);

  // The tech section reuses a football plate — the most structural-looking
  // photography in the set.
  const techImage = previews["sports/football"]?.image ?? heroImage?.url ?? "";

  return (
    <>
      {heroProduct && heroImage && (
        <Hero
          product={{
            slug: heroProduct.slug,
            name: heroProduct.name,
            image: heroImage.url,
            alt: heroImage.alt,
          }}
        />
      )}

      <FeaturedCategories categories={categories} />

      <ProductRail
        eyebrow="Just landed"
        title="New arrivals"
        description="The most recent additions to the range, straight off the last."
        href="/shop?sort=newest"
        hrefLabel="View all new"
        products={newArrivals}
      />

      {/* Best sellers as a grid rather than a rail — it reads as the
          definitive list, which a scrollable row does not. */}
      <section className="container-page section-y">
        <Reveal>
          <p className="text-eyebrow text-brand">Proven</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <h2 className="max-w-[16ch] text-display-lg">Best sellers</h2>
            <Link
              href="/shop?sort=rating"
              className="group inline-flex shrink-0 items-center gap-2 text-sm font-medium"
            >
              Shop top rated
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>

        <div className="mt-14">
          <ProductGrid products={bestSellers} />
        </div>
      </section>

      <PerformanceTech image={techImage} />

      {collection && <FeaturedCollection collection={collection} />}
    </>
  );
}
