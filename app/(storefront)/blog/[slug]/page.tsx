import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

import { getPublishedPostBySlug, getPublishedPosts } from "@/lib/admin/queries/blog";
import { renderMarkdown, readingMinutes } from "@/lib/markdown";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return { title: "Not found" };

  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt || undefined,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) notFound();

  // A few more from the same category to keep readers moving.
  const more = (
    await getPublishedPosts({ categorySlug: post.categorySlug ?? undefined, limit: 4 })
  )
    .filter((p) => p.slug !== post.slug)
    .slice(0, 3);

  return (
    <article className="pb-24 pt-28 md:pt-40">
      <div className="container-page max-w-3xl">
        <Link
          href="/blog"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← All articles
        </Link>

        <header className="mt-8">
          {post.categoryName ? (
            <Link
              href={`/blog?category=${post.categorySlug}`}
              className="text-eyebrow text-brand"
            >
              {post.categoryName}
            </Link>
          ) : null}
          <h1 className="mt-4 text-display-md">{post.title}</h1>
          <p className="mt-6 text-sm text-muted-foreground">
            {post.authorName} · {post.publishedAt ? formatDate(post.publishedAt) : ""} ·{" "}
            {readingMinutes(post.body)} min read
          </p>
        </header>
      </div>

      {post.coverImage ? (
        <div className="container-page mt-10 max-w-4xl">
          <div className="relative aspect-16/9 overflow-hidden rounded-2xl bg-muted">
            <Image
              src={post.coverImage}
              alt=""
              fill
              sizes="(min-width: 896px) 896px, 100vw"
              className="object-cover"
              priority
            />
          </div>
        </div>
      ) : null}

      <div className="container-page mt-12 max-w-2xl">
        <div
          className="prose-storefront text-body-lg leading-relaxed"
          // Safe: renderMarkdown escapes all input before formatting.
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }}
        />

        {post.tags.length > 0 && (
          <div className="mt-12 flex flex-wrap gap-2 border-t border-border pt-8">
            {post.tags.map((tag) => (
              <Link
                key={tag.slug}
                href={`/blog?tag=${tag.slug}`}
                className="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground hover:bg-muted"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {more.length > 0 && (
        <div className="container-page mt-20">
          <h2 className="text-display-sm">Keep reading</h2>
          <ul className="mt-8 grid gap-8 md:grid-cols-3">
            {more.map((p) => (
              <li key={p.id}>
                <Link href={`/blog/${p.slug}`} className="group block">
                  {p.coverImage ? (
                    <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-muted">
                      <Image
                        src={p.coverImage}
                        alt=""
                        fill
                        sizes="(min-width: 768px) 33vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-4/3 rounded-xl bg-muted" />
                  )}
                  <h3 className="mt-3 font-display text-lg font-semibold tracking-tight group-hover:text-brand">
                    {p.title}
                  </h3>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
