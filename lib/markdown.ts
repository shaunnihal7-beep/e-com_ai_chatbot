/**
 * A deliberately small Markdown subset for CMS body copy.
 *
 * SECURITY: the input is escaped *first*, then formatting is applied to the
 * escaped text. Raw HTML written into the editor is therefore rendered as
 * visible characters, never as markup — an editor account cannot inject a
 * script into the storefront. Everything below only ever emits tags this file
 * itself writes.
 *
 * Supported: # ## ### headings, **bold**, *italic*, `code`, [links](url),
 * - bullet lists, 1. numbered lists, > quotes, --- rules, paragraphs.
 */

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Blocks anything that isn't http(s), a root-relative path, or mailto. */
function safeHref(raw: string): string | null {
  const href = raw.trim();
  if (/^https?:\/\//i.test(href)) return href;
  if (/^mailto:[^\s]+@[^\s]+$/i.test(href)) return href;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  return null;
}

const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;
const BOLD_RE = /\*\*([^*]+)\*\*/g;
const ITALIC_RE = /(^|[^*])\*([^*]+)\*/g;

/** Inline formatting. Operates on already-escaped text. */
function inline(text: string): string {
  // Split on backticks so code spans are never touched by the link and
  // emphasis passes. Even indexes are prose, odd indexes are code.
  return text
    .split("`")
    .map((segment, i) => {
      if (i % 2 === 1) {
        return `<code class="rounded bg-muted px-1 py-0.5 text-[0.9em]">${segment}</code>`;
      }

      let out = segment.replace(LINK_RE, (_m, label: string, href: string) => {
        const safe = safeHref(href);
        if (!safe) return label; // Unsafe scheme — keep the words, drop the link.
        const external = /^https?:\/\//i.test(safe);
        const rel = external ? ' target="_blank" rel="noopener noreferrer"' : "";
        return `<a href="${safe}" class="underline underline-offset-2 hover:text-brand"${rel}>${label}</a>`;
      });

      out = out.replace(BOLD_RE, "<strong>$1</strong>");
      out = out.replace(ITALIC_RE, "$1<em>$2</em>");
      return out;
    })
    .join("");
}

export function renderMarkdown(source: string): string {
  const lines = escapeHtml(source.replace(/\r\n/g, "\n")).split("\n");
  const html: string[] = [];

  let paragraph: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let quoting = false;

  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${inline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };
  const closeQuote = () => {
    if (quoting) {
      html.push("</blockquote>");
      quoting = false;
    }
  };
  const closeAll = () => {
    flushParagraph();
    closeList();
    closeQuote();
  };

  const HEADING_CLASS: Record<number, string> = {
    1: "mt-8 mb-3 font-display text-3xl font-semibold tracking-tight",
    2: "mt-8 mb-3 font-display text-2xl font-semibold tracking-tight",
    3: "mt-6 mb-2 font-display text-lg font-semibold",
    4: "mt-4 mb-2 text-base font-semibold",
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      closeAll();
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (heading) {
      closeAll();
      const level = heading[1].length;
      html.push(
        `<h${level} class="${HEADING_CLASS[level]}">${inline(heading[2])}</h${level}>`,
      );
      continue;
    }

    if (/^(---|\*\*\*)$/.test(trimmed)) {
      closeAll();
      html.push('<hr class="my-8 border-border" />');
      continue;
    }

    const quote = /^&gt;\s?(.*)$/.exec(trimmed);
    if (quote) {
      flushParagraph();
      closeList();
      if (!quoting) {
        html.push(
          '<blockquote class="my-4 border-l-2 border-brand pl-4 text-muted-foreground italic">',
        );
        quoting = true;
      }
      html.push(`<p>${inline(quote[1])}</p>`);
      continue;
    }
    closeQuote();

    const bullet = /^[-*]\s+(.*)$/.exec(trimmed);
    if (bullet) {
      flushParagraph();
      if (listType !== "ul") {
        closeList();
        html.push('<ul class="my-4 list-disc space-y-1 pl-5">');
        listType = "ul";
      }
      html.push(`<li>${inline(bullet[1])}</li>`);
      continue;
    }

    const numbered = /^\d+\.\s+(.*)$/.exec(trimmed);
    if (numbered) {
      flushParagraph();
      if (listType !== "ol") {
        closeList();
        html.push('<ol class="my-4 list-decimal space-y-1 pl-5">');
        listType = "ol";
      }
      html.push(`<li>${inline(numbered[1])}</li>`);
      continue;
    }

    closeList();
    paragraph.push(trimmed);
  }

  closeAll();
  return html.join("\n");
}

/** Plain text, for excerpts and meta descriptions. */
export function stripMarkdown(source: string): string {
  return source
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^[#>\s]*[-*]?\s*/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function excerptFrom(source: string, length = 160): string {
  const text = stripMarkdown(source);
  if (text.length <= length) return text;
  const cut = text.lastIndexOf(" ", length);
  return `${text.slice(0, cut > 0 ? cut : length).trim()}…`;
}

/** Rough reading time, used on blog cards. */
export function readingMinutes(source: string): number {
  const words = stripMarkdown(source).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/**
 * Splits an FAQ page body into question/answer pairs on its "## " headings, so
 * the FAQ template can render accordions from the same Markdown field.
 */
export function parseFaq(source: string): { question: string; answer: string }[] {
  const sections = source.split(/^##\s+/m).slice(1);
  return sections
    .map((section) => {
      const [question, ...rest] = section.split("\n");
      return { question: question.trim(), answer: rest.join("\n").trim() };
    })
    .filter((item) => item.question && item.answer);
}
