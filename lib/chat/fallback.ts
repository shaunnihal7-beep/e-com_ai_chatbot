import "server-only";

import { formatPrice } from "@/lib/format";
import { POLICIES, type ChatContext } from "./retrieval";

/**
 * Deterministic responder used whenever Ollama is unreachable.
 *
 * It answers from exactly the same retrieved context the model would have
 * received, so the assistant degrades in fluency but never in accuracy — and
 * the widget is never broken just because a local daemon isn't running.
 */
export function fallbackReply(message: string, context: ChatContext): string {
  switch (context.intent) {
    case "shipping":
      return [
        "Here's how delivery works:",
        ...POLICIES.shipping.map((line) => `• ${line}`),
      ].join("\n");

    case "returns":
      return [
        "Our returns policy in short:",
        ...POLICIES.returns.map((line) => `• ${line}`),
      ].join("\n");

    case "sizing":
      return [
        "On sizing:",
        ...POLICIES.sizing.map((line) => `• ${line}`),
      ].join("\n");

    case "order_status": {
      if (!context.orderNumber) {
        return "Happy to check — what's the order number? It looks like VLC-123456. You can also see every order at /account/orders.";
      }
      // buildContext already resolved the order (or established it doesn't
      // exist) into `facts`, so this is a faithful answer either way.
      return context.facts;
    }

    case "product_search": {
      if (context.products.length === 0) {
        return "I couldn't find anything matching that in the catalogue. Try widening the budget, or tell me the sport and I'll narrow it down.";
      }

      const lines = context.products.map((p) => {
        const price = formatPrice(p.salePriceCents ?? p.priceCents);
        const sale = p.salePriceCents ? " (on sale)" : "";
        return `• ${p.name} — ${price}${sale}. ${p.subtitle}.`;
      });

      return [
        context.products.length === 1
          ? "Here's the closest match:"
          : `Here ${context.products.length === 2 ? "are two" : `are ${context.products.length}`} that fit:`,
        ...lines,
      ].join("\n");
    }

    default:
      return [
        "I can help with product recommendations, sizing, delivery, returns and order status.",
        "",
        "Try: \"a firm ground boot under $200\", \"do these run true to size?\", or give me an order number like VLC-123456.",
      ].join("\n");
  }
}
