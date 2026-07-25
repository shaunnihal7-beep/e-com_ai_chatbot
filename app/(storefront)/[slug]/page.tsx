import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublishedPage } from "@/lib/admin/queries/pages";
import { parseFaq, renderMarkdown } from "@/lib/markdown";
import { FaqAccordion } from "@/components/layout/faq-accordion";

/**
 * Catch-all for CMS static pages (About, Contact, Privacy, Terms, FAQ, …).
 *
 * This route sits last in the storefront routing order, so it never shadows a
 * real page — Next matches specific segments before this dynamic one. The CMS
 * also rejects reserved slugs up front, so a page can't be created at a path
 * the storefront already owns.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublishedPage(slug);
  if (!page) return { title: "Not found" };

  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription || undefined,
  };
}

export default async function StaticPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPublishedPage(slug);
  if (!page) notFound();

  const faqItems = page.template === "faq" ? parseFaq(page.body) : [];

  return (
    <div className="container-page max-w-3xl pb-24 pt-28 md:pt-40">
      <h1 className="text-display-md">{page.title}</h1>

      {page.template === "faq" && faqItems.length > 0 ? (
        <div className="mt-12">
          <FaqAccordion items={faqItems} />
        </div>
      ) : (
        <div
          className="prose-storefront mt-10 text-body-lg leading-relaxed"
          // Safe: renderMarkdown escapes all input before formatting.
          dangerouslySetInnerHTML={{ __html: renderMarkdown(page.body) }}
        />
      )}
    </div>
  );
}
