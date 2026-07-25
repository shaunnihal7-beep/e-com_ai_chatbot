import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { getBlogCategories, getBlogTags } from "@/lib/admin/queries/blog";
import { CategoryManager, TagManager } from "@/components/admin/taxonomy-manager";
import { PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Categories & tags" };
export const dynamic = "force-dynamic";

export default async function BlogTaxonomyPage() {
  const [categories, tags] = await Promise.all([getBlogCategories(), getBlogTags()]);

  return (
    <>
      <Link
        href="/admin/blog"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to posts
      </Link>

      <PageHeader
        title="Categories & tags"
        description="Organise the blog. Deleting a category leaves its posts uncategorised rather than removing them."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryManager categories={categories} />
        <TagManager tags={tags} />
      </div>
    </>
  );
}
