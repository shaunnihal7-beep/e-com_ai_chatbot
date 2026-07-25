import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import { getPublicTaxonomy, getPublishedPosts } from "@/lib/admin/queries/blog";
import { excerptFrom, readingMinutes } from "@/lib/markdown";
import { formatDate } from "@/lib/format";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Journal",
  description: "Training, gear and stories from the Veloce team.",
};

export const dynamic = "force-dynamic";

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; tag?: string }>;
}) {
  const { category, tag } = await searchParams;

  const [posts, taxonomy] = await Promise.all([
    getPublishedPosts({ categorySlug: category, tagSlug: tag }),
    getPublicTaxonomy(),
  ]);

  const [lead, ...rest] = posts;

  return (
    <div className="container-page pb-24 pt-28 md:pt-40">
      <p className="text-eyebrow text-brand">Journal</p>
      <h1 className="mt-6 max-w-[18ch] text-display-xl">Notes on running well.</h1>

      {/* Category filter */}
      {taxonomy.categories.length > 0 && (
        <nav className="mt-10 flex flex-wrap gap-2" aria-label="Filter by category">
          <Link
            href="/blog"
            className={`rounded-full border px-4 py-1.5 text-sm ${
              !category ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"
            }`}
          >
            All
          </Link>
          {taxonomy.categories.map((c) => (
            <Link
              key={c.slug}
              href={`/blog?category=${c.slug}`}
              className={`rounded-full border px-4 py-1.5 text-sm ${
                category === c.slug
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:bg-muted"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </nav>
      )}

      {posts.length === 0 ? (
        <p className="mt-16 text-body-lg text-muted-foreground">
          No articles here yet. Check back soon.
        </p>
      ) : (
        <div className="mt-12 space-y-16">
          {/* Lead article */}
          <Reveal>
            <Link href={`/blog/${lead.slug}`} className="group block">
              <div className="grid gap-8 md:grid-cols-2 md:items-center">
                {lead.coverImage ? (
                  <div className="relative aspect-4/3 overflow-hidden rounded-2xl bg-muted">
                    <Image
                      src={lead.coverImage}
                      alt=""
                      fill
                      sizes="(min-width: 768px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-4/3 rounded-2xl bg-muted" />
                )}

                <div>
                  {lead.categoryName ? (
                    <p className="text-eyebrow text-brand">{lead.categoryName}</p>
                  ) : null}
                  <h2 className="mt-4 text-display-sm group-hover:text-brand">{lead.title}</h2>
                  <p className="mt-4 max-w-prose text-body-lg text-muted-foreground">
                    {lead.excerpt || excerptFrom(lead.body)}
                  </p>
                  <p className="mt-6 text-sm text-muted-foreground">
                    {lead.authorName} ·{" "}
                    {lead.publishedAt ? formatDate(lead.publishedAt) : ""} ·{" "}
                    {readingMinutes(lead.body)} min read
                  </p>
                </div>
              </div>
            </Link>
          </Reveal>

          {/* Grid */}
          {rest.length > 0 && (
            <ul className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <li key={post.id}>
                  <Link href={`/blog/${post.slug}`} className="group block">
                    {post.coverImage ? (
                      <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-muted">
                        <Image
                          src={post.coverImage}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-4/3 rounded-xl bg-muted" />
                    )}

                    {post.categoryName ? (
                      <p className="mt-4 text-eyebrow text-brand">{post.categoryName}</p>
                    ) : null}
                    <h3 className="mt-2 font-display text-xl font-semibold tracking-tight group-hover:text-brand">
                      {post.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-muted-foreground">
                      {post.excerpt || excerptFrom(post.body)}
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {post.publishedAt ? formatDate(post.publishedAt) : ""} ·{" "}
                      {readingMinutes(post.body)} min read
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
