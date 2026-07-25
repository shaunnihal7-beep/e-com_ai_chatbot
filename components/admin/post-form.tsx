"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createPostAction,
  updatePostAction,
  type ActionState,
} from "@/app/actions/admin/blog";
import type { PostForEdit } from "@/lib/admin/queries/blog";
import { slugify } from "@/lib/slug";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownField } from "@/components/admin/markdown-field";
import { Panel } from "@/components/admin/ui";

const initial: ActionState = { ok: false, message: "" };

type Taxonomy = { id: number; name: string };

export function PostForm({
  post,
  categories,
  tags,
  defaultAuthor,
}: {
  post?: PostForEdit;
  categories: Taxonomy[];
  tags: Taxonomy[];
  defaultAuthor: string;
}) {
  const router = useRouter();
  const isEdit = Boolean(post);

  const [state, formAction, pending] = useActionState(
    isEdit ? updatePostAction : createPostAction,
    initial,
  );

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) {
      toast.success(state.message);
      if (!isEdit && state.id) router.push(`/admin/blog/${state.id}`);
      else router.refresh();
    } else {
      toast.error(state.message);
    }
  }, [state, isEdit, router]);

  const errors = state.fieldErrors ?? {};
  const selectedTags = new Set(post?.tagIds ?? []);

  return (
    <form action={formAction} className="grid gap-4 lg:grid-cols-3">
      {post ? <input type="hidden" name="id" value={post.id} /> : null}

      <div className="space-y-4 lg:col-span-2">
        <Panel title="Post">
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
                placeholder="How to choose your first running shoe"
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
              <p className="text-xs text-muted-foreground">Storefront: /blog/{slug || "…"}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                name="excerpt"
                defaultValue={post?.excerpt ?? ""}
                rows={2}
                placeholder="Leave blank to generate from the post body."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="body">Content</Label>
              <MarkdownField id="body" name="body" defaultValue={post?.body ?? ""} />
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
                defaultValue={post?.seoTitle ?? ""}
                maxLength={70}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seoDescription">SEO description</Label>
              <Textarea
                id="seoDescription"
                name="seoDescription"
                defaultValue={post?.seoDescription ?? ""}
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
                defaultValue={post?.status ?? "draft"}
                className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="authorName">Author</Label>
              <Input
                id="authorName"
                name="authorName"
                defaultValue={post?.authorName ?? defaultAuthor}
                required
                className="h-9"
              />
              {errors.authorName ? (
                <p className="text-xs text-destructive">{errors.authorName}</p>
              ) : null}
            </div>
          </div>
        </Panel>

        <Panel title="Organisation">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="categoryId">Category</Label>
              <select
                id="categoryId"
                name="categoryId"
                defaultValue={post?.categoryId ?? ""}
                className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring"
              >
                <option value="">Uncategorised</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">Tags</legend>
              {tags.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No tags yet. Create them under Categories &amp; tags.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <label
                      key={tag.id}
                      className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-sm has-checked:border-foreground has-checked:bg-muted"
                    >
                      <input
                        type="checkbox"
                        name="tagIds"
                        value={tag.id}
                        defaultChecked={selectedTags.has(tag.id)}
                        className="size-3.5"
                      />
                      {tag.name}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>

            <div className="space-y-1.5">
              <Label htmlFor="coverImage">Cover image URL</Label>
              <Input
                id="coverImage"
                name="coverImage"
                defaultValue={post?.coverImage ?? ""}
                className="h-9 font-mono text-sm"
                placeholder="/blog/cover.jpg"
              />
            </div>
          </div>
        </Panel>

        <div className="space-y-2 rounded-xl border border-border bg-background p-4">
          <Button type="submit" size="lg" disabled={pending} className="w-full">
            {pending ? "Saving…" : isEdit ? "Save changes" : "Create post"}
          </Button>
          <ButtonLink href="/admin/blog" variant="ghost" size="lg" className="w-full">
            Cancel
          </ButtonLink>
        </div>
      </div>
    </form>
  );
}
