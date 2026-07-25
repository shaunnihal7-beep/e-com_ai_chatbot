"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { renderMarkdown } from "@/lib/markdown";

/**
 * Renders an FAQ page's parsed question/answer pairs as an accordion. Answers
 * are Markdown, run through the same escaping renderer as everything else.
 */
export function FaqAccordion({
  items,
}: {
  items: { question: string; answer: string }[];
}) {
  return (
    <Accordion className="divide-y divide-border border-y border-border">
      {items.map((item, i) => (
        <AccordionItem key={i} value={`item-${i}`} className="py-1">
          <AccordionTrigger className="py-4 text-left font-display text-lg font-semibold tracking-tight">
            {item.question}
          </AccordionTrigger>
          <AccordionContent>
            <div
              className="prose-storefront pb-4 leading-relaxed text-muted-foreground"
              // Safe: renderMarkdown escapes all input before formatting.
              dangerouslySetInnerHTML={{ __html: renderMarkdown(item.answer) }}
            />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
