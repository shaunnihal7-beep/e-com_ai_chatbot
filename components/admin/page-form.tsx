"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createPageAction,
  updatePageAction,
  type ActionState,
} from "@/app/actions/admin/pages";
import type { Page } from "@/db/schema";
import { slugify } from "@/lib/slug";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownField } from "@/components/admin/markdown-field";
import { Panel } from "@/components/admin/ui";

const initial: ActionState = { ok: false, message: "" };

export function PageForm({ page }: { page?: Page }) {
  const router = useRouter();
  const isEdit = Boolean(page);

  const [state, formAction, pending] = useActionState(
    isEdit ? updatePageAction : createPageAction,
    initial,
  );

  const [title, setTitle] = useState(page?.title ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [template, setTemplate] = useState(page?.template ?? "page");

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) {
      toast.success(state.message);
      if (!isEdit && state.id) router.push(`/admin/pages/${state.id}`);
      else router.refresh();
    } else {
      toast.error(state.message);
    }
  }, [state, isEdit, router]);

  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="grid gap-4 lg:grid-cols-3">
      {page ? <input type="hidden" name="id" value={page.id} /> : null}

      <div className="space-y-4 lg:col-span-2">
        <Panel title="Page">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
                required
                className="h-9"
                placeholder="About us"
              />
              {errors.title ? <p className="text-xs text-destructive">{errors.title}</p> : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slug">URL slug</Label>
              <Input
                id="slug"
                name="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                onBlur={(e) => setSlug(slugify(e.target.value))}
                className="h-9 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Storefront: /{slug || "…"}</p>
              {errors.slug ? <p className="text-xs text-destructive">{errors.slug}</p> : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="body">Content</Label>
              <MarkdownField id="body" name="body" defaultValue={page?.body ?? ""} />
              {template === "faq" ? (
                <p className="text-xs text-muted-foreground">
                  FAQ template: each <code className="rounded bg-muted px-1">## Question</code>{" "}
                  heading becomes a collapsible row, with the text beneath it as the answer.
                </p>
              ) : null}
              {errors.body ? <p className="text-xs text-destructive">{errors.body}</p> : null}
            </div>
          </div>
        </Panel>

        <Panel title="Search engine listing">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="seoTitle">SEO title</Label>
              <Input
                id="seoTitle"
                name="seoTitle"
                defaultValue={page?.seoTitle ?? ""}
                maxLength={70}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seoDescription">SEO description</Label>
              <Textarea
                id="seoDescription"
                name="seoDescription"
                defaultValue={page?.seoDescription ?? ""}
                maxLength={180}
                rows={2}
              />
            </div>
          </div>
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel title="Publish">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                defaultValue={page?.status ?? "draft"}
                className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="template">Template</Label>
              <select
                id="template"
                name="template"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring"
              >
                <option value="page">Standard page</option>
                <option value="faq">FAQ (accordion)</option>
              </select>
            </div>
          </div>
        </Panel>

        <Panel title="Navigation">
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="showInFooter"
                defaultChecked={page?.showInFooter ?? false}
                className="size-4"
              />
              Show in footer
            </label>

            <div className="space-y-1.5">
              <Label htmlFor="sortOrder">Footer order</Label>
              <Input
                id="sortOrder"
                name="sortOrder"
                defaultValue={page?.sortOrder ?? 0}
                inputMode="numeric"
                className="h-9 w-24"
              />
              <p className="text-xs text-muted-foreground">Lower numbers appear first.</p>
            </div>
          </div>
        </Panel>

        <div className="space-y-2 rounded-xl border border-border bg-background p-4">
          <Button type="submit" size="lg" disabled={pending} className="w-full">
            {pending ? "Saving…" : isEdit ? "Save changes" : "Create page"}
          </Button>
          <ButtonLink href="/admin/pages" variant="ghost" size="lg" className="w-full">
            Cancel
          </ButtonLink>
        </div>
      </div>
    </form>
  );
}
