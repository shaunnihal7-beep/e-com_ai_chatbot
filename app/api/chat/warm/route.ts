import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2:3b";

/**
 * Asks Ollama to load the model without generating anything.
 *
 * Called when the chat panel opens. A cold model costs ~15s to page in, which
 * lands entirely on the customer's first question; firing this while they are
 * still reading the greeting moves that cost off the critical path.
 *
 * Best-effort by design — if Ollama is down this quietly reports it and the
 * chat endpoint falls back to catalogue answers as usual.
 */
export async function POST() {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // An empty message list is the documented way to load a model and
      // return immediately, rather than generating a throwaway reply.
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [],
        keep_alive: "30m",
      }),
      signal: AbortSignal.timeout(60_000),
    });

    return NextResponse.json({ warm: response.ok });
  } catch {
    return NextResponse.json({ warm: false });
  }
}
