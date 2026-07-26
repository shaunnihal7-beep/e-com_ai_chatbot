import { NextRequest } from "next/server";

import { buildContext, SYSTEM_PROMPT, isNegativeQuestion, isRelated } from "@/lib/chat/retrieval";
import { fallbackReply } from "@/lib/chat/fallback";

export const runtime = "nodejs";
// Every reply depends on live catalogue state, so nothing here is cacheable.
export const dynamic = "force-dynamic";

const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2:3b";

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: NextRequest) {
  let body: { messages?: ChatMessage[] };
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const messages = body.messages ?? [];
  const latest = [...messages].reverse().find((m) => m.role === "user");
  if (!latest?.content?.trim()) {
    return new Response("No message provided", { status: 400 });
  }

  const userQuery = latest.content.trim();

  if (isNegativeQuestion(userQuery)) {
    const reply = "Veloce is a premium performance footwear brand dedicated to outstanding quality, comfort, and innovative design. We invite you to check our website on your own to explore our collections and see what we have to offer.\n\nYou can browse all of our products at our shop page: /shop, or check out our collections at /collections. To see what other shoppers think, feel free to read customer reviews directly on any of our product pages or learn more about us on our about page at /about.";
    const headers: Record<string, string> = {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Veloce-Intent": "general",
      "X-Veloce-Source": "fallback",
    };
    return new Response(reply, { headers });
  }

  if (!isRelated(userQuery)) {
    const reply = "Sorry I don't have information about this query.";
    const headers: Record<string, string> = {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Veloce-Intent": "general",
      "X-Veloce-Source": "fallback",
    };
    return new Response(reply, { headers });
  }


  // Ground the reply in real catalogue rows before the model ever sees it.
  const context = await buildContext(latest.content);

  const cards = context.products.map((p) => ({
    slug: p.slug,
    name: p.name,
    subtitle: p.subtitle,
    price: p.salePriceCents ?? p.priceCents,
    wasPrice: p.salePriceCents ? p.priceCents : null,
    image: (p.colors.find((c) => c.isDefault) ?? p.colors[0])?.images[0]?.url ?? "",
    rating: p.rating,
    reviewCount: p.reviewCount,
  }));

  const headers: Record<string, string> = {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Veloce-Intent": context.intent,
  };
  // Cards ride along in a header so the body stays a clean text stream.
  if (cards.length > 0) {
    headers["X-Veloce-Products"] = Buffer.from(JSON.stringify(cards)).toString("base64");
  }

  // Keep a short window of turns — llama3.2:3b degrades with a long history,
  // and the retrieved FACTS carry the actual grounding.
  const history = messages.slice(-6).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const payload = {
    model: OLLAMA_MODEL,
    stream: true,
    // Ollama evicts an idle model after five minutes, and reloading 3B of
    // weights costs ~15s on the next question. Holding it resident for half an
    // hour is the single biggest thing separating a snappy assistant from a
    // laggy one; the memory is already allocated while someone is shopping.
    keep_alive: "30m",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(0, -1),
      {
        role: "user",
        content: `FACTS (retrieved from the Veloce database — this is everything you know):\n${context.facts}\n\nCUSTOMER: ${latest.content}`,
      },
    ],
    options: {
      temperature: 0.4,
      // Trimmed from 320: replies were running long, and every extra token is
      // another second the customer watches a cursor blink. Support answers
      // want to be short anyway.
      num_predict: 200,
      // The prompt is a system prompt plus a compact FACTS block — it never
      // approaches the 8k default, and a smaller window allocates faster.
      num_ctx: 2048,
    },
  };

  let upstream: Response;
  try {
    upstream = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    // Ollama not running / not reachable — answer from the same context.
    headers["X-Veloce-Source"] = "fallback";
    return new Response(fallbackReply(latest.content, context), { headers });
  }

  if (!upstream.ok || !upstream.body) {
    headers["X-Veloce-Source"] = "fallback";
    return new Response(fallbackReply(latest.content, context), { headers });
  }

  headers["X-Veloce-Source"] = "ollama";

  // Ollama streams NDJSON; unwrap it into plain text tokens.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = "";
      let produced = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          // The final element may be a partial line.
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line) as {
                message?: { content?: string };
                done?: boolean;
              };
              const token = parsed.message?.content;
              if (token) {
                produced = true;
                controller.enqueue(encoder.encode(token));
              }
            } catch {
              // Ignore malformed lines rather than killing the stream.
            }
          }
        }

        // Model connected but said nothing useful — don't leave a blank bubble.
        if (!produced) {
          controller.enqueue(encoder.encode(fallbackReply(latest.content, context)));
        }
      } catch {
        if (!produced) {
          controller.enqueue(encoder.encode(fallbackReply(latest.content, context)));
        }
      } finally {
        controller.close();
        reader.releaseLock();
      }
    },
  });

  return new Response(stream, { headers });
}
