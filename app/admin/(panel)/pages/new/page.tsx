import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { PageForm } from "@/components/admin/page-form";
import { PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "New page" };

export default function NewPagePage() {
  return (
    <>
      <Link
        href="/admin/pages"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to pages
      </Link>

      <PageHeader
        title="New page"
        description="Write in Markdown. Choose the FAQ template to build a question-and-answer list."
      />

      <PageForm />
    </>
  );
}
