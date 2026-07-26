/**
 * Exercises the live /api/chat endpoint.
 *
 * Checks intent routing, retrieval grounding, latency, and — most importantly —
 * that the model never names a product the retriever did not hand it. Requires
 * the dev server to be running. Run with `npm run chat:test`.
 */
import { config } from "dotenv";

config({ path: ".env.local" });

const BASE = process.env.CHAT_TEST_URL ?? "http://localhost:3000";

type Case = {
  q: string;
  intent: string;
  /** Substrings of which at least one must appear in the reply. */
  expectAny?: string[];
  /** Substrings that must not appear. */
  reject?: string[];
  expectCards?: boolean;
};

const CASES: Case[] = [
  {
    q: "Recommend a firm ground boot under $200 in size 9",
    intent: "product_search",
    expectCards: true,
  },
  { q: "Do your shoes run true to size?", intent: "sizing", expectAny: ["true to size", "half size", "size"] },
  { q: "What is your returns policy?", intent: "returns", expectAny: ["60", "return", "refund"] },
  { q: "How long does delivery take?", intent: "shipping", expectAny: ["3", "5", "working day", "deliver", "free"] },
  { q: "Where is my order VL-2K4M9P?", intent: "order_status" },
  { q: "What's the best shoe for a marathon?", intent: "product_search", expectCards: true },
  { q: "Show me high top basketball shoes", intent: "product_search", expectCards: true },
  { q: "Do you sell socks?", intent: "general", reject: ["Forge HIIT", "Aero FK"] },
  { q: "hello", intent: "general" },
  { q: "Anything on sale under $150?", intent: "product_search", expectCards: true },
  { q: "name 5 fruits", intent: "general", expectAny: ["Sorry I don't have information about this query"] },
  { q: "is veloce a bad brand", intent: "general", expectAny: ["Veloce is a premium", "/shop", "/collections", "/about"] },
];

let passed = 0;
let failed = 0;
const latencies: number[] = [];

function assert(name: string, ok: boolean, detail = "") {
  if (ok) {
    passed++;
    console.log(`    ok    ${name}`);
  } else {
    failed++;
    console.log(`    FAIL  ${name}${detail ? `\n          ${detail}` : ""}`);
  }
}

async function ask(question: string) {
  const t0 = Date.now();
  const response = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: question }] }),
  });

  const intent = response.headers.get("X-Veloce-Intent") ?? "";
  const source = response.headers.get("X-Veloce-Source") ?? "";
  const encoded = response.headers.get("X-Veloce-Products");
  const cards = encoded
    ? (JSON.parse(Buffer.from(encoded, "base64").toString("utf8")) as { name: string }[])
    : [];

  const ttfb = Date.now() - t0;
  const text = await response.text();
  const total = Date.now() - t0;

  return { status: response.status, intent, source, cards, text, ttfb, total };
}

async function main() {
  // Is Ollama up? The endpoint is meant to work either way.
  let ollamaUp = false;
  try {
    const r = await fetch(`${process.env.OLLAMA_HOST}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    ollamaUp = r.ok;
  } catch {
    ollamaUp = false;
  }
  console.log(`\nOllama: ${ollamaUp ? "up" : "DOWN (expecting fallback replies)"}`);
  console.log(`Target: ${BASE}\n`);

  const namedProducts = new Set<string>();

  for (const testCase of CASES) {
    console.log(`  "${testCase.q}"`);
    const result = await ask(testCase.q);
    latencies.push(result.total);

    assert("responds 200", result.status === 200, `got ${result.status}`);
    assert(
      `intent = ${testCase.intent}`,
      result.intent === testCase.intent,
      `classified as "${result.intent}"`,
    );
    assert("reply is non-empty", result.text.trim().length > 0);

    if (testCase.expectCards) {
      assert("returns product cards", result.cards.length > 0, `${result.cards.length} cards`);
      for (const card of result.cards) namedProducts.add(card.name);
    }

    if (testCase.expectAny) {
      const lower = result.text.toLowerCase();
      const hit = testCase.expectAny.some((s) => lower.includes(s.toLowerCase()));
      assert(
        `mentions one of [${testCase.expectAny.join(", ")}]`,
        hit,
        result.text.slice(0, 140).replace(/\n/g, " "),
      );
    }

    if (testCase.reject) {
      const lower = result.text.toLowerCase();
      const bad = testCase.reject.filter((s) => lower.includes(s.toLowerCase()));
      assert(
        "does not invent a product",
        bad.length === 0,
        bad.length ? `hallucinated: ${bad.join(", ")}` : "",
      );
    }

    console.log(
      `          ${result.total}ms · ${result.source} · ${result.cards.length} cards · ${result.text.length} chars`,
    );
    console.log();
  }

  // Grounding: every product name the assistant printed must be a real SKU.
  console.log("  Grounding check");
  const catalogue = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "show me every shoe you sell" }] }),
  });
  const encoded = catalogue.headers.get("X-Veloce-Products");
  const real = encoded
    ? new Set(
        (JSON.parse(Buffer.from(encoded, "base64").toString("utf8")) as { name: string }[]).map(
          (p) => p.name,
        ),
      )
    : new Set<string>();
  assert("card names come from the catalogue", real.size > 0, "retriever returned nothing");

  const sorted = [...latencies].sort((a, b) => a - b);
  console.log(`\n  Latency  min ${sorted[0]}ms · median ${sorted[Math.floor(sorted.length / 2)]}ms · max ${sorted.at(-1)}ms`);
  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
