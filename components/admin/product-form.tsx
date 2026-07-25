"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  createProductAction,
  updateProductAction,
  type ActionState,
} from "@/app/actions/admin/products";
import type { ProductForEdit } from "@/lib/admin/queries/products";
import { GENDERS } from "@/lib/admin/constants";
import { slugify } from "@/lib/slug";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "@/components/admin/ui";

const initial: ActionState = { ok: false, message: "" };

type Category = { id: number; name: string; path: string };

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function ProductForm({
  product,
  categories,
}: {
  product?: ProductForEdit;
  categories: Category[];
}) {
  const router = useRouter();
  const isEdit = Boolean(product);

  const [state, formAction, pending] = useActionState(
    isEdit ? updateProductAction : createProductAction,
    initial,
  );

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  // Only auto-fill the slug for new products — changing a live URL should
  // always be a deliberate act, never a side effect of fixing a typo.
  const [slugTouched, setSlugTouched] = useState(isEdit);

  useEffect(() => {
    if (state.message) {
      if (state.ok) {
        toast.success(state.message);
        // A new product needs its real id before variants can be attached.
        if (!isEdit && state.id) router.push(`/admin/products/${state.id}`);
        else router.refresh();
      } else {
        toast.error(state.message);
      }
    }
  }, [state, isEdit, router]);

  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="grid gap-4 lg:grid-cols-3">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      <div className="space-y-4 lg:col-span-2">
        <Panel title="Basics">
          <div className="space-y-4">
            <Field label="Title" htmlFor="name" error={errors.name}>
              <Input
                id="name"
                name="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
                required
                className="h-9"
                placeholder="Aero FK"
              />
            </Field>

            <Field
              label="URL slug"
              htmlFor="slug"
              hint={`Storefront address: /product/${slug || "…"}`}
              error={errors.slug}
            >
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
                placeholder="aero-fk"
              />
            </Field>

            <Field
              label="Short description"
              htmlFor="subtitle"
              hint="One line, shown on product cards and in search results."
              error={errors.subtitle}
            >
              <Input
                id="subtitle"
                name="subtitle"
                defaultValue={product?.subtitle ?? ""}
                required
                className="h-9"
                placeholder="Featherweight racer for tempo days"
              />
            </Field>

            <Field label="Description" htmlFor="description" error={errors.description}>
              <Textarea
                id="description"
                name="description"
                defaultValue={product?.description ?? ""}
                required
                rows={5}
                placeholder="What the product is, who it's for, and why it exists."
              />
            </Field>

            <Field
              label="Technology story"
              htmlFor="story"
              hint="Optional. Longer-form copy for the product page's technology section."
              error={errors.story}
            >
              <Textarea
                id="story"
                name="story"
                defaultValue={product?.story ?? ""}
                rows={4}
              />
            </Field>
          </div>
        </Panel>

        <Panel title="Pricing">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price" htmlFor="price" hint="In dollars, e.g. 189" error={errors.priceCents}>
              <Input
                id="price"
                name="price"
                defaultValue={product ? (product.priceCents / 100).toFixed(2) : ""}
                required
                inputMode="decimal"
                className="h-9"
                placeholder="189.00"
              />
            </Field>

            <Field
              label="Sale price"
              htmlFor="salePrice"
              hint="Leave blank for no discount."
              error={errors.salePriceCents}
            >
              <Input
                id="salePrice"
                name="salePrice"
                defaultValue={
                  product?.salePriceCents ? (product.salePriceCents / 100).toFixed(2) : ""
                }
                inputMode="decimal"
                className="h-9"
                placeholder="149.00"
              />
            </Field>
          </div>
        </Panel>

        <Panel title="Specifications" description="All optional — shown on the product page.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Technologies"
              htmlFor="technologies"
              hint="Comma separated, e.g. AeroFoam, Carbon Plate"
              error={errors.technologies}
            >
              <Input
                id="technologies"
                name="technologies"
                defaultValue={product?.technologies?.join(", ") ?? ""}
                className="h-9"
              />
            </Field>

            <Field label="SKU" htmlFor="sku" error={errors.sku}>
              <Input
                id="sku"
                name="sku"
                defaultValue={product?.sku ?? ""}
                className="h-9 font-mono text-sm"
                placeholder="VLC-AERO-FK"
              />
            </Field>

            <Field label="Weight (grams)" htmlFor="weightGrams" error={errors.weightGrams}>
              <Input
                id="weightGrams"
                name="weightGrams"
                defaultValue={product?.weightGrams ?? ""}
                inputMode="numeric"
                className="h-9"
              />
            </Field>

            <Field label="Heel-toe drop (mm)" htmlFor="dropMm" error={errors.dropMm}>
              <Input
                id="dropMm"
                name="dropMm"
                defaultValue={product?.dropMm ?? ""}
                inputMode="decimal"
                className="h-9"
              />
            </Field>
          </div>
        </Panel>

        <Panel title="Search engine listing" description="How this product appears on Google.">
          <div className="space-y-4">
            <Field
              label="SEO title"
              htmlFor="seoTitle"
              hint="Up to 70 characters. Defaults to the product title."
              error={errors.seoTitle}
            >
              <Input
                id="seoTitle"
                name="seoTitle"
                defaultValue={product?.seoTitle ?? ""}
                maxLength={70}
                className="h-9"
              />
            </Field>

            <Field
              label="SEO description"
              htmlFor="seoDescription"
              hint="Up to 180 characters. Defaults to the short description."
              error={errors.seoDescription}
            >
              <Textarea
                id="seoDescription"
                name="seoDescription"
                defaultValue={product?.seoDescription ?? ""}
                maxLength={180}
                rows={2}
              />
            </Field>
          </div>
        </Panel>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        <Panel title="Visibility">
          <div className="space-y-4">
            <Field
              label="Status"
              htmlFor="status"
              hint="Only published products appear on the storefront."
            >
              <select
                id="status"
                name="status"
                defaultValue={product?.status ?? "draft"}
                className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </Field>

            <Field label="Category" htmlFor="categoryId" error={errors.categoryId}>
              <select
                id="categoryId"
                name="categoryId"
                defaultValue={product?.categoryId ?? ""}
                required
                className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring"
              >
                <option value="" disabled>
                  Choose a category…
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} — /{category.path}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Audience" htmlFor="gender">
              <select
                id="gender"
                name="gender"
                defaultValue={product?.gender ?? "unisex"}
                className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm capitalize outline-none focus-visible:border-ring"
              >
                {GENDERS.map((gender) => (
                  <option key={gender} value={gender} className="capitalize">
                    {gender}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Panel>

        <Panel title="Merchandising">
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isNew"
                defaultChecked={product?.isNew ?? false}
                className="size-4 rounded border-input"
              />
              Show “New” badge
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isBestSeller"
                defaultChecked={product?.isBestSeller ?? false}
                className="size-4 rounded border-input"
              />
              Mark as best seller
            </label>

            <Field
              label="Low stock threshold"
              htmlFor="lowStockThreshold"
              hint="Blank uses the store default."
              error={errors.lowStockThreshold}
            >
              <Input
                id="lowStockThreshold"
                name="lowStockThreshold"
                defaultValue={product?.lowStockThreshold ?? ""}
                inputMode="numeric"
                className="h-9"
                placeholder="6"
              />
            </Field>
          </div>
        </Panel>

        <div className="space-y-2 rounded-xl border border-border bg-background p-4">
          <Button type="submit" size="lg" disabled={pending} className="w-full">
            {pending ? "Saving…" : isEdit ? "Save changes" : "Create product"}
          </Button>

          <ButtonLink
            href="/admin/products"
            variant="ghost"
            size="lg"
            className="w-full"
          >
            Cancel
          </ButtonLink>

          {!isEdit ? (
            <p className="text-center text-xs text-muted-foreground">
              Colourways, sizes and images can be added once the product exists.
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
