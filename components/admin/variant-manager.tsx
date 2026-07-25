"use client";

import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  addColorAction,
  addImageAction,
  addSizeAction,
  bulkStockAction,
  deleteColorAction,
  deleteImageAction,
  deleteSizeAction,
  reorderImageAction,
  setDefaultColorAction,
  updateColorAction,
  updateStockAction,
  type ActionState,
} from "@/app/actions/admin/products";
import type { ProductForEdit } from "@/lib/admin/queries/products";
import { formatSize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ActionButton } from "@/components/admin/action-button";
import { Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: ActionState = { ok: false, message: "" };

type Color = ProductForEdit["colors"][number];

/**
 * Variants for one product: colourways, each with its own image set and size
 * run. Stock is edited in place — the field saves on blur, so a merchandiser
 * can tab through a whole size run without touching a save button.
 */
export function VariantManager({ product }: { product: ProductForEdit }) {
  const [selectedId, setSelectedId] = useState<number | null>(
    product.colors.find((c) => c.isDefault)?.id ?? product.colors[0]?.id ?? null,
  );

  const selected =
    product.colors.find((color) => color.id === selectedId) ?? product.colors[0] ?? null;

  return (
    <div className="space-y-4">
      <Panel
        title="Colourways"
        description="Each colourway has its own photos and size run."
      >
        <div className="flex flex-wrap gap-2">
          {product.colors.map((color) => (
            <button
              key={color.id}
              type="button"
              onClick={() => setSelectedId(color.id)}
              aria-pressed={selected?.id === color.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                selected?.id === color.id
                  ? "border-foreground bg-muted"
                  : "border-border hover:bg-muted",
              )}
            >
              <span
                className="size-4 shrink-0 rounded-full border border-border"
                style={{ backgroundColor: color.hex }}
                aria-hidden
              />
              <span>{color.name}</span>
              {color.isDefault ? (
                <Star className="size-3 fill-current text-brand" aria-label="Default" />
              ) : null}
              <span className="text-xs text-muted-foreground">
                {color.sizes.reduce((sum, s) => sum + s.stock, 0)} in stock
              </span>
            </button>
          ))}
        </div>

        <AddColorForm productId={product.id} />
      </Panel>

      {selected ? (
        <>
          <ColorSettings color={selected} productId={product.id} />
          <ImageManager color={selected} />
          <SizeManager color={selected} />
        </>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function AddColorForm({ productId }: { productId: number }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(addColorAction, initial);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) {
      toast.success(state.message);
      setOpen(false);
      router.refresh();
    } else {
      toast.error(state.message);
    }
  }, [state, router]);

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" aria-hidden />
        Add colourway
      </Button>
    );
  }

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-border p-3">
      <input type="hidden" name="productId" value={productId} />

      <div className="space-y-1.5">
        <Label htmlFor="color-name">Name</Label>
        <Input id="color-name" name="name" required placeholder="Core Black" className="h-9 w-40" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="color-hex">Swatch</Label>
        <Input
          id="color-hex"
          name="hex"
          type="color"
          defaultValue="#111111"
          className="h-9 w-16 p-1"
        />
      </div>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Adding…" : "Add"}
      </Button>
      <Button type="button" variant="ghost" size="lg" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </form>
  );
}

/* ------------------------------------------------------------------ */

function ColorSettings({ color, productId }: { color: Color; productId: number }) {
  const router = useRouter();
  const [name, setName] = useState(color.name);
  const [hex, setHex] = useState(color.hex);
  const [saving, setSaving] = useState(false);

  // Reset the local fields when the selected colourway changes.
  useEffect(() => {
    setName(color.name);
    setHex(color.hex);
  }, [color.id, color.name, color.hex]);

  const dirty = name !== color.name || hex !== color.hex;

  const save = async () => {
    setSaving(true);
    const result = await updateColorAction(color.id, { name, hex });
    setSaving(false);
    if (result.ok) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <Panel title={`“${color.name}” settings`}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`name-${color.id}`}>Name</Label>
          <Input
            id={`name-${color.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 w-48"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`hex-${color.id}`}>Swatch</Label>
          <Input
            id={`hex-${color.id}`}
            type="color"
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            className="h-9 w-16 p-1"
          />
        </div>

        {dirty ? (
          <Button type="button" size="lg" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        ) : null}

        <div className="ml-auto flex items-center gap-1">
          {!color.isDefault ? (
            <ActionButton
              action={() => setDefaultColorAction(color.id, productId)}
              size="sm"
              variant="outline"
            >
              <Check className="size-3.5" aria-hidden />
              Make default
            </ActionButton>
          ) : (
            <span className="text-xs text-muted-foreground">
              Default colourway — shown first on the storefront.
            </span>
          )}

          <ActionButton
            action={() => deleteColorAction(color.id)}
            size="sm"
            variant="destructive"
            confirm="Delete colourway"
          >
            <Trash2 className="size-3.5" aria-hidden />
            Delete
          </ActionButton>
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */

function ImageManager({ color }: { color: Color }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(addImageAction, initial);

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) {
      toast.success(state.message);
      router.refresh();
    } else {
      toast.error(state.message);
    }
  }, [state, router]);

  return (
    <Panel
      title="Images"
      description="The first image is the product card photo; the second is the hover swap."
    >
      {color.images.length === 0 ? (
        <p className="mb-4 rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No images yet. Add at least one so the product renders correctly.
        </p>
      ) : (
        <ul className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {color.images.map((image, index) => (
            <li key={image.id} className="rounded-lg border border-border p-2">
              <div className="relative aspect-4/5 overflow-hidden rounded-md bg-muted">
                <Image
                  src={image.url}
                  alt={image.alt}
                  fill
                  sizes="200px"
                  className="object-cover"
                />
                {index === 0 ? (
                  <span className="absolute top-1.5 left-1.5 rounded bg-foreground px-1.5 py-0.5 text-[0.65rem] font-medium text-background">
                    Primary
                  </span>
                ) : null}
              </div>

              <p className="mt-2 truncate text-xs text-muted-foreground" title={image.alt}>
                {image.alt}
              </p>

              <div className="mt-1.5 flex items-center gap-0.5">
                <ActionButton
                  action={() => reorderImageAction(image.id, "up")}
                  size="icon-xs"
                  title="Move earlier"
                >
                  <ArrowUp className="size-3" aria-hidden />
                </ActionButton>
                <ActionButton
                  action={() => reorderImageAction(image.id, "down")}
                  size="icon-xs"
                  title="Move later"
                >
                  <ArrowDown className="size-3" aria-hidden />
                </ActionButton>
                <ActionButton
                  action={() => deleteImageAction(image.id)}
                  size="icon-xs"
                  variant="destructive"
                  title="Remove image"
                  className="ml-auto"
                >
                  <Trash2 className="size-3" aria-hidden />
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
        <input type="hidden" name="colorId" value={color.id} />

        <div className="min-w-[16rem] flex-1 space-y-1.5">
          <Label htmlFor={`url-${color.id}`}>Image URL</Label>
          <Input
            id={`url-${color.id}`}
            name="url"
            required
            placeholder="/products/aero-fk-black-1.jpg"
            className="h-9 font-mono text-sm"
          />
        </div>

        <div className="min-w-[14rem] flex-1 space-y-1.5">
          <Label htmlFor={`alt-${color.id}`}>Alt text</Label>
          <Input
            id={`alt-${color.id}`}
            name="alt"
            required
            placeholder="Aero FK in core black, side view"
            className="h-9"
          />
        </div>

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Adding…" : "Add image"}
        </Button>
      </form>

      <p className="mt-2 text-xs text-muted-foreground">
        Files in <code className="rounded bg-muted px-1">public/</code> are referenced by path,
        e.g. <code className="rounded bg-muted px-1">/products/name.jpg</code>. Full https:// URLs
        also work.
      </p>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */

function SizeManager({ color }: { color: Color }) {
  const [bulk, setBulk] = useState("");
  const [newSize, setNewSize] = useState("");

  const total = color.sizes.reduce((sum, s) => sum + s.stock, 0);

  return (
    <Panel
      title="Sizes & stock"
      description={`${total} units across ${color.sizes.length} sizes. Changes save when you leave the field.`}
    >
      {color.sizes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No sizes yet.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {color.sizes.map((size) => (
            <StockField key={size.id} id={size.id} size={size.size} stock={size.stock} />
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
        <div className="space-y-1.5">
          <Label htmlFor={`bulk-${color.id}`}>Set every size to</Label>
          <div className="flex items-center gap-2">
            <Input
              id={`bulk-${color.id}`}
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              inputMode="numeric"
              placeholder="25"
              className="h-9 w-24"
            />
            <ActionButton
              action={async () => {
                const result = await bulkStockAction(color.id, Number(bulk));
                setBulk("");
                return result;
              }}
              size="lg"
              variant="outline"
            >
              Apply
            </ActionButton>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`newsize-${color.id}`}>Add a size</Label>
          <div className="flex items-center gap-2">
            <Input
              id={`newsize-${color.id}`}
              value={newSize}
              onChange={(e) => setNewSize(e.target.value)}
              inputMode="decimal"
              placeholder="15"
              className="h-9 w-24"
            />
            <ActionButton
              action={async () => {
                const result = await addSizeAction(color.id, Number(newSize));
                if (result.ok) setNewSize("");
                return result;
              }}
              size="lg"
              variant="outline"
            >
              <Plus className="size-3.5" aria-hidden />
              Add
            </ActionButton>
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {total} units in stock for {color.name}.
      </p>
    </Panel>
  );
}

function StockField({ id, size, stock }: { id: number; size: number; stock: number }) {
  const router = useRouter();
  const [value, setValue] = useState(String(stock));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(String(stock));
  }, [stock]);

  const commit = async () => {
    if (Number(value) === stock) return;
    setSaving(true);
    const result = await updateStockAction(id, Number(value));
    setSaving(false);
    if (result.ok) router.refresh();
    else toast.error(result.message);
  };

  return (
    <li className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5">
      <span className="w-8 shrink-0 text-xs font-medium tabular-nums">
        {formatSize(size)}
      </span>

      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        inputMode="numeric"
        aria-label={`Stock for US ${formatSize(size)}`}
        className={cn(
          "h-7 w-full tabular-nums",
          Number(value) === 0 && "text-destructive",
          saving && "opacity-60",
        )}
      />

      <ActionButton
        action={() => deleteSizeAction(id)}
        size="icon-xs"
        variant="ghost"
        title={`Remove size ${formatSize(size)}`}
      >
        <Trash2 className="size-3" aria-hidden />
      </ActionButton>
    </li>
  );
}
