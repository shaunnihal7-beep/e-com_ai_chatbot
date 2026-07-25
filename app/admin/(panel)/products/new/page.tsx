import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { getAllCategories } from "@/lib/admin/queries/products";
import { ProductForm } from "@/components/admin/product-form";
import { PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  const categories = await getAllCategories();

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
        title="New product"
        description="Create the product first, then add its colourways, sizes and photos."
      />

      <ProductForm categories={categories} />
    </>
  );
}
