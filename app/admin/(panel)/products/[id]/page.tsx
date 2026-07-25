import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { formatDate } from "@/lib/format";
import {
  getAllCategories,
  getProductForEdit,
  getProductReviewSummary,
} from "@/lib/admin/queries/products";
import { ProductForm } from "@/components/admin/product-form";
import { ProductDetailActions } from "@/components/admin/product-detail-actions";
import { VariantManager } from "@/components/admin/variant-manager";
import { PageHeader, StatusBadge } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductForEdit(Number(id));
  return { title: product ? product.name : "Product" };
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId)) notFound();

  const [product, categories] = await Promise.all([
    getProductForEdit(productId),
    getAllCategories(),
  ]);
  if (!product) notFound();

  const reviews = await getProductReviewSummary(productId);

  return (
    <>
      <Link
        href="/admin/products"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to products
      </Link>

      <PageHeader
        title={product.name}
        description={`Updated ${formatDate(product.updatedAt)} · ${reviews.count} approved review${reviews.count === 1 ? "" : "s"}${reviews.count ? ` · ${reviews.average.toFixed(1)}★` : ""}`}
      >
        <StatusBadge status={product.status} />
        <ProductDetailActions id={productId} slug={product.slug} status={product.status} />
      </PageHeader>

      <ProductForm product={product} categories={categories} />

      <div className="mt-8">
        <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">
          Variants
        </h2>
        <VariantManager product={product} />
      </div>
    </>
  );
}
