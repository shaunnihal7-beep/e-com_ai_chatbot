import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { getPageStatusCounts, listPages } from "@/lib/admin/queries/pages";
import { FilterTabs, SearchInput } from "@/components/admin/filters";
import { PageRowActions } from "@/components/admin/page-row-actions";
import {
  EmptyState,
  PageHeader,
  StatusBadge,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/button-link";

export const metadata: Metadata = { title: "Pages" };
export const dynamic = "force-dynamic";

export default async function AdminPagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  const [rows, counts] = await Promise.all([
    listPages({ q: params.q, status: params.status }),
    getPageStatusCounts(),
  ]);

  return (
    <>
      <PageHeader
        title="Pages"
        description="Static pages like About, Contact, Privacy, Terms and FAQ."
      >
        <ButtonLink href="/admin/pages/new" size="lg">
          <Plus className="size-4" aria-hidden />
          New page
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
        <SearchInput placeholder="Search pages…" />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No pages yet"
          description="Create your first page — About, Contact, Privacy Policy, Terms or FAQ."
          action={
            <ButtonLink href="/admin/pages/new">
              <Plus className="size-4" aria-hidden />
              New page
            </ButtonLink>
          }
        />
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Title</Th>
              <Th>Status</Th>
              <Th>Template</Th>
              <Th>Footer</Th>
              <Th>Updated</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((page) => (
              <tr key={page.id} className="hover:bg-muted/50">
                <Td>
                  <Link href={`/admin/pages/${page.id}`} className="font-medium hover:underline">
                    {page.title}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">/{page.slug}</p>
                </Td>
                <Td>
                  <StatusBadge status={page.status} />
                </Td>
                <Td className="text-sm text-muted-foreground capitalize">
                  {page.template === "faq" ? "FAQ" : "Page"}
                </Td>
                <Td className="text-sm text-muted-foreground">
                  {page.showInFooter ? "Shown" : "Hidden"}
                </Td>
                <Td className="text-sm text-muted-foreground">
                  {new Date(page.updatedAt).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Td>
                <Td className="text-right">
                  <PageRowActions id={page.id} slug={page.slug} status={page.status} />
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </>
  );
}
