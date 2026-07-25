import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { getBlogCategories, getPostStatusCounts, listPosts } from "@/lib/admin/queries/blog";
import { FilterTabs, Pagination, SearchInput, SelectFilter } from "@/components/admin/filters";
import { PostRowActions } from "@/components/admin/post-row-actions";
import {
  EmptyState,
  PageHeader,
  StatusBadge,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/button-link";

export const metadata: Metadata = { title: "Blog posts" };
export const dynamic = "force-dynamic";

export default async function AdminBlogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  const [{ rows, total, page, pageCount }, counts, categories] = await Promise.all([
    listPosts({
      q: params.q,
      status: params.status,
      categoryId: params.category ? Number(params.category) : undefined,
      page: params.page ? Number(params.page) : 1,
    }),
    getPostStatusCounts(),
    getBlogCategories(),
  ]);

  return (
    <>
      <PageHeader title="Blog posts" description="Write and publish articles for the storefront.">
        <ButtonLink href="/admin/blog/taxonomy" variant="outline" size="lg">
          Categories &amp; tags
        </ButtonLink>
        <ButtonLink href="/admin/blog/new" size="lg">
          <Plus className="size-4" aria-hidden />
          New post
        </ButtonLink>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "published", label: "Published", count: counts.published },
            { value: "draft", label: "Drafts", count: counts.draft },
            { value: "archived", label: "Archived", count: counts.archived },
          ]}
        />
        <div className="flex items-center gap-2">
          <SelectFilter
            param="category"
            label="Filter by category"
            options={[
              { value: "all", label: "All categories" },
              ...categories.map((c) => ({ value: String(c.id), label: c.name })),
            ]}
          />
          <SearchInput placeholder="Search posts…" />
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No posts yet"
          description="Write your first article to get the blog going."
          action={
            <ButtonLink href="/admin/blog/new">
              <Plus className="size-4" aria-hidden />
              New post
            </ButtonLink>
          }
        />
      ) : (
        <>
          <TableShell>
            <thead>
              <tr>
                <Th>Title</Th>
                <Th>Status</Th>
                <Th>Category</Th>
                <Th>Author</Th>
                <Th>Updated</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((post) => (
                <tr key={post.id} className="hover:bg-muted/50">
                  <Td>
                    <Link
                      href={`/admin/blog/${post.id}`}
                      className="font-medium hover:underline"
                    >
                      {post.title}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">/{post.slug}</p>
                  </Td>
                  <Td>
                    <StatusBadge status={post.status} />
                  </Td>
                  <Td className="text-sm text-muted-foreground">
                    {post.categoryName ?? "—"}
                  </Td>
                  <Td className="text-sm text-muted-foreground">{post.authorName}</Td>
                  <Td className="text-sm text-muted-foreground">
                    {new Date(post.updatedAt).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Td>
                  <Td className="text-right">
                    <PostRowActions id={post.id} slug={post.slug} status={post.status} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>

          <Pagination page={page} pageCount={pageCount} total={total} />
        </>
      )}
    </>
  );
}
