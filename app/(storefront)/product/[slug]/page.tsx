import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getProductBySlug, getProducts, getRelatedProducts } from "@/lib/queries/products";
import { ProductDetail } from "@/components/product/product-detail";
import { ProductReviews } from "@/components/product/product-reviews";
import { ProductGrid } from "@/components/product/product-grid";
import { Reveal } from "@/components/motion/reveal";

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  const products = await getProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return { title: "Not found" };

  const image = product.colors[0]?.images[0]?.url;

  return {
    title: product.name,
    description: product.description.slice(0, 160),
    openGraph: {
      title: `${product.name} — Veloce`,
      description: product.subtitle,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product.id, product.categoryPath, 4);

  return (
    <>
      <ProductDetail product={product} />

      <ProductReviews product={product} />

      {related.length > 0 && (
        <section className="border-t border-border">
          <div className="container-page section-y">
            <Reveal>
              <p className="text-eyebrow text-brand">More like this</p>
              <div className="mt-4 flex items-end justify-between gap-6">
                <h2 className="text-display-md">You might also like</h2>
                <Link
                  href={`/shop/${product.categoryPath}`}
                  className="link-sweep hidden shrink-0 text-sm md:block"
                >
                  View all {product.categoryName}
                </Link>
              </div>
            </Reveal>

            <div className="mt-12">
              <ProductGrid products={related} />
            </div>
          </div>
        </section>
      )}
    </>
  );
}
