import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { requireAdmin } from "@/lib/admin/auth";
import { getBlogCategories, getBlogTags, getPostForEdit } from "@/lib/admin/queries/blog";
import { PostForm } from "@/components/admin/post-form";
import { PostRowActions } from "@/components/admin/post-row-actions";
import { PageHeader, StatusBadge } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await getPostForEdit(Number(id));
  return { title: post ? post.title : "Post" };
}

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId)) notFound();

  const [session, post, categories, tags] = await Promise.all([
    requireAdmin(),
    getPostForEdit(postId),
    getBlogCategories(),
    getBlogTags(),
  ]);
  if (!post) notFound();

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
        title={post.title}
        description={`/blog/${post.slug}`}
      >
        <StatusBadge status={post.status} />
        <PostRowActions id={post.id} slug={post.slug} status={post.status} />
      </PageHeader>

      <PostForm post={post} categories={categories} tags={tags} defaultAuthor={session.name} />
    </>
  );
}
