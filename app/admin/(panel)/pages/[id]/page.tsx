import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { getPageById } from "@/lib/admin/queries/pages";
import { PageForm } from "@/components/admin/page-form";
import { PageRowActions } from "@/components/admin/page-row-actions";
import { PageHeader, StatusBadge } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const page = await getPageById(Number(id));
  return { title: page ? page.title : "Page" };
}

export default async function EditPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pageId = Number(id);
  if (!Number.isInteger(pageId)) notFound();

  const page = await getPageById(pageId);
  if (!page) notFound();

  return (
    <>
      <Link
        href="/admin/pages"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to pages
      </Link>

      <PageHeader title={page.title} description={`/${page.slug}`}>
        <StatusBadge status={page.status} />
        <PageRowActions id={page.id} slug={page.slug} status={page.status} />
      </PageHeader>

      <PageForm page={page} />
    </>
  );
}
