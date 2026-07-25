import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { requireAdmin } from "@/lib/admin/auth";
import { getBlogCategories, getBlogTags } from "@/lib/admin/queries/blog";
import { PostForm } from "@/components/admin/post-form";
import { PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "New post" };

export default async function NewPostPage() {
  const [session, categories, tags] = await Promise.all([
    requireAdmin(),
    getBlogCategories(),
    getBlogTags(),
  ]);

  return (
    <>
      <Link
        href="/admin/blog"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to posts
      </Link>

      <PageHeader title="New post" description="Write in Markdown; preview before you publish." />

      <PostForm categories={categories} tags={tags} defaultAuthor={session.name} />
    </>
  );
}
