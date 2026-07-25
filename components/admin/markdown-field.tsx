"use client";

import { useState } from "react";

import { renderMarkdown } from "@/lib/markdown";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * A Markdown editor with a live preview toggle. The preview uses the same
 * renderer the storefront does, so what an editor sees is exactly what ships —
 * including the fact that raw HTML is escaped, not executed.
 */
export function MarkdownField({
  name,
  defaultValue = "",
  rows = 16,
  id,
}: {
  name: string;
  defaultValue?: string;
  rows?: number;
  id?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [preview, setPreview] = useState(false);

  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center justify-between border-b border-border px-2 py-1.5">
        <div className="flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setPreview(false)}
            className={cn(
              "rounded px-2 py-1",
              !preview ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setPreview(true)}
            className={cn(
              "rounded px-2 py-1",
              preview ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Preview
          </button>
        </div>
        <p className="pr-1 text-xs text-muted-foreground">
          Markdown · **bold** *italic* # heading - list
        </p>
      </div>

      {preview ? (
        <div
          className="prose-admin min-h-[16rem] px-4 py-3 text-sm"
          // Safe: renderMarkdown escapes all input before formatting it.
          dangerouslySetInnerHTML={{
            __html: value.trim() ? renderMarkdown(value) : "<p class='text-muted-foreground'>Nothing to preview yet.</p>",
          }}
        />
      ) : (
        <Textarea
          id={id}
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={rows}
          className="rounded-none border-0 font-mono text-sm focus-visible:ring-0"
        />
      )}

      {/* Keep the value posted even while the preview tab is showing. */}
      {preview ? <input type="hidden" name={name} value={value} /> : null}
    </div>
  );
}
