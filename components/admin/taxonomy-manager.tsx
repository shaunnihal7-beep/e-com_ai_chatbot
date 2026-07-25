"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  deleteCategoryAction,
  deleteTagAction,
  saveCategoryAction,
  saveTagAction,
  type ActionState,
} from "@/app/actions/admin/blog";
import { ActionButton } from "@/components/admin/action-button";
import { Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initial: ActionState = { ok: false, message: "" };

type CategoryRow = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  postCount: number;
};
type TagRow = { id: number; name: string; slug: string; postCount: number };

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<number | null>(null);
  const [state, formAction, pending] = useActionState(saveCategoryAction, initial);

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) {
      toast.success(state.message);
      setEditing(null);
      router.refresh();
    } else {
      toast.error(state.message);
    }
  }, [state, router]);

  const current = categories.find((c) => c.id === editing);

  return (
    <Panel title="Categories" description="Group posts into sections.">
      <ul className="mb-4 divide-y divide-border">
        {categories.length === 0 ? (
          <li className="py-3 text-sm text-muted-foreground">No categories yet.</li>
        ) : (
          categories.map((category) => (
            <li key={category.id} className="flex items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">{category.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  /{category.slug} · {category.postCount} post{category.postCount === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Edit"
                  onClick={() => setEditing(category.id)}
                >
                  <Pencil className="size-3.5" aria-hidden />
                </Button>
                <ActionButton
                  action={() => deleteCategoryAction(category.id)}
                  size="xs"
                  variant="destructive"
                  confirm="Delete"
                >
                  Delete
                </ActionButton>
              </div>
            </li>
          ))
        )}
      </ul>

      {/* key resets the uncontrolled fields when switching between add/edit. */}
      <form key={editing ?? "new"} action={formAction} className="space-y-3 border-t border-border pt-4">
        {current ? <input type="hidden" name="id" value={current.id} /> : null}

        <p className="text-sm font-medium">
          {current ? `Edit “${current.name}”` : "Add a category"}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Name</Label>
            <Input id="cat-name" name="name" defaultValue={current?.name ?? ""} required className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-slug">Slug</Label>
            <Input
              id="cat-slug"
              name="slug"
              defaultValue={current?.slug ?? ""}
              className="h-9 font-mono text-sm"
              placeholder="auto"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cat-description">Description</Label>
          <Textarea
            id="cat-description"
            name="description"
            defaultValue={current?.description ?? ""}
            rows={2}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" size="lg" disabled={pending}>
            {current ? "Save" : (
              <>
                <Plus className="size-4" aria-hidden />
                Add category
              </>
            )}
          </Button>
          {current ? (
            <Button type="button" variant="ghost" size="lg" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          ) : null}
        </div>
      </form>
    </Panel>
  );
}

export function TagManager({ tags }: { tags: TagRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<number | null>(null);
  const [state, formAction, pending] = useActionState(saveTagAction, initial);

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) {
      toast.success(state.message);
      setEditing(null);
      router.refresh();
    } else {
      toast.error(state.message);
    }
  }, [state, router]);

  const current = tags.find((t) => t.id === editing);

  return (
    <Panel title="Tags" description="Cross-cutting labels for posts.">
      <ul className="mb-4 flex flex-wrap gap-1.5">
        {tags.length === 0 ? (
          <li className="text-sm text-muted-foreground">No tags yet.</li>
        ) : (
          tags.map((tag) => (
            <li
              key={tag.id}
              className="flex items-center gap-1.5 rounded-lg border border-border py-1 pr-1 pl-2.5 text-sm"
            >
              <button
                type="button"
                onClick={() => setEditing(tag.id)}
                className="hover:underline"
                title="Edit tag"
              >
                {tag.name}
              </button>
              <span className="text-xs text-muted-foreground">{tag.postCount}</span>
              <ActionButton
                action={() => deleteTagAction(tag.id)}
                size="icon-xs"
                variant="ghost"
                confirm="Delete"
                title="Delete tag"
              >
                ×
              </ActionButton>
            </li>
          ))
        )}
      </ul>

      <form key={editing ?? "new"} action={formAction} className="space-y-3 border-t border-border pt-4">
        {current ? <input type="hidden" name="id" value={current.id} /> : null}

        <p className="text-sm font-medium">{current ? `Edit “${current.name}”` : "Add a tag"}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="tag-name">Name</Label>
            <Input id="tag-name" name="name" defaultValue={current?.name ?? ""} required className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tag-slug">Slug</Label>
            <Input
              id="tag-slug"
              name="slug"
              defaultValue={current?.slug ?? ""}
              className="h-9 font-mono text-sm"
              placeholder="auto"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" size="lg" disabled={pending}>
            {current ? "Save" : (
              <>
                <Plus className="size-4" aria-hidden />
                Add tag
              </>
            )}
          </Button>
          {current ? (
            <Button type="button" variant="ghost" size="lg" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          ) : null}
        </div>
      </form>
    </Panel>
  );
}
