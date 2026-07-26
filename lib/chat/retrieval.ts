import "server-only";

import { getProducts, searchProducts } from "@/lib/queries/products";
import { getOrderByNumber } from "@/lib/queries/orders";
import { formatPrice, formatSize } from "@/lib/format";
import { flattenTaxonomy } from "@/lib/taxonomy";
import type { ProductCard } from "@/lib/types";

export type Intent =
  | "product_search"
  | "sizing"
  | "shipping"
  | "returns"
  | "order_status"
  | "general";

export type ChatContext = {
  intent: Intent;
  /** Facts injected into the system prompt. The model may use nothing else. */
  facts: string;
  /** Rendered as rich cards under the reply. */
  products: ProductCard[];
  orderNumber?: string;
};

/* ------------------------------------------------------------------ */
/* Policy copy — the single source for both the LLM and the fallback   */
/* ------------------------------------------------------------------ */

export const POLICIES = {
  shipping: [
    "Standard delivery costs $9.95 and arrives in 3-5 working days.",
    "Orders over $150 ship free.",
    "Express delivery is available at checkout for next working day if ordered before 1pm.",
    "We ship to the UK, EU and US.",
  ],
  returns: [
    "Returns are accepted within 60 days of delivery, worn or unworn.",
    "Refunds go back to the original payment method within 5 working days of us receiving the shoes.",
    "Return postage is free — a prepaid label is in every box.",
    "Exchanges for a different size or colour can be arranged from the My Orders page.",
  ],
  sizing: [
    "Every Veloce model fits true to size.",
    "If you are between sizes, take the half size up — feet swell over distance.",
    "Running and training shoes come in US 6 to 13, football boots in US 6 to 12, and basketball shoes in US 7 to 15.",
    "Half sizes are available across the whole range.",
    "The Forge HIIT and Grid Cross have a deliberately wide toe box; the Meridian and Tempo Elite are cut narrow for racing.",
  ],
  warranty: [
    "Every pair carries a two-year construction warranty.",
    "The warranty covers manufacturing defects, not normal outsole wear.",
  ],
};

/* ------------------------------------------------------------------ */
/* Intent classification                                               */
/* ------------------------------------------------------------------ */

/**
 * Scored rather than first-match.
 *
 * First-match got "a firm ground boot under $200 in size 9" wrong: the word
 * "size" tripped the sizing rule, so no products were retrieved and the model
 * had nothing to ground on. A shopping question that happens to mention a size
 * is still a shopping question, so signals compete on weight instead.
 */
const SIGNALS: [Intent, RegExp, number][] = [
  // Returns
  ["returns", /\b(returns?|refunds?|exchanges?|money back)\b|send.{0,10}back/i, 3],

  // Shipping
  ["shipping", /\b(ship|shipping|deliver(y|ed)?|postage|dispatch|courier)\b/i, 3],
  ["shipping", /\bhow long.{0,20}(take|arrive|deliver)/i, 3],

  // Sizing — only strong when the message is actually about fit.
  ["sizing", /\b(true to size|size guide|sizing|fits?|fitting|narrow|wide|width|half size)\b/i, 3],
  ["sizing", /\b(what|which|whats|what's) size\b/i, 3],
  ["sizing", /\bruns? (big|small|large|narrow|wide)\b/i, 3],
  // A bare "size 9" is a weak hint — it usually qualifies a shopping request.
  ["sizing", /\bsizes?\b/i, 1],

  // Product search
  ["product_search", /\b(recommend|suggest|looking for|show me|any good|best|top)\b/i, 3],
  [
    "product_search",
    /\b(firm ground|soft ground|high top|mid top|running|training|football|soccer|basketball|marathon|gym|lifting)\b/i,
    3,
  ],
  ["product_search", /\b(under|below|less than|cheaper than|up to|budget|around)\s*\$?\s*\d+/i, 2],
  ["product_search", /\b(shoes?|boots?|trainers?|sneakers?|cleats?|kicks)\b/i, 1],
];

export function classifyIntent(message: string): Intent {
  // An order number is unambiguous — nothing outranks it.
  if (/\bvlc-\d+\b/i.test(message)) return "order_status";
  if (/\b(order status|my orders?|track(ing)?)\b/i.test(message)) return "order_status";
  if (/where.{0,15}\b(order|parcel|package|delivery)\b/i.test(message)) {
    return "order_status";
  }

  const scores = new Map<Intent, number>();
  for (const [intent, pattern, weight] of SIGNALS) {
    if (pattern.test(message)) {
      scores.set(intent, (scores.get(intent) ?? 0) + weight);
    }
  }

  if (scores.size === 0) return "general";

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const [topIntent, topScore] = ranked[0];

  // On a tie, prefer showing products — a wrong policy answer is worse than a
  // relevant product list.
  const tied = ranked.filter(([, score]) => score === topScore).map(([i]) => i);
  return tied.includes("product_search") ? "product_search" : topIntent;
}

/* ------------------------------------------------------------------ */
/* Query parsing                                                       */
/* ------------------------------------------------------------------ */

/** Maps natural phrasing onto taxonomy paths. */
const CATEGORY_HINTS: [RegExp, string][] = [
  [/\b(firm ground|fg)\b/i, "sports/football/fg"],
  [/\b(soft ground|sg|mud|muddy|wet pitch)\b/i, "sports/football/sg"],
  [/\b(football|soccer|boot|cleat|pitch)\b/i, "sports/football"],
  [/\b(high top|high-top|ankle support)\b/i, "basketball/high-top"],
  [/\b(mid top|mid-top)\b/i, "basketball/mid-top"],
  [/\b(basketball|court|hoops)\b/i, "basketball"],
  [/\b(run|running|marathon|5k|10k|race|racer|jog)\b/i, "sports/running"],
  [/\b(train|training|gym|lift|weight|crossfit|hiit)\b/i, "sports/training"],
];

function parsePriceCap(message: string): number | undefined {
  // "under $150", "below 150", "less than $200"
  const match = message.match(/\b(?:under|below|less than|max|up to|cheaper than)\s*\$?\s*(\d{2,4})\b/i);
  return match ? Number(match[1]) * 100 : undefined;
}

function parseSize(message: string): number | undefined {
  const match = message.match(/\b(?:size|uk|us)\s*(\d{1,2}(?:\.5)?)\b/i);
  return match ? Number(match[1]) : undefined;
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

function describe(product: ProductCard): string {
  const price = product.salePriceCents
    ? `${formatPrice(product.salePriceCents)} (reduced from ${formatPrice(product.priceCents)})`
    : formatPrice(product.priceCents);

  const colors = product.colors.map((c) => c.name).join(", ");
  const rating = product.reviewCount
    ? `rated ${product.rating.toFixed(1)}/5 from ${product.reviewCount} reviews`
    : "no reviews yet";

  return [
    `- ${product.name} (${product.categoryName}) — ${price}, ${rating}.`,
    `  ${product.subtitle}. Colours: ${colors}. Tech: ${product.technologies.join(", ")}.`,
    `  Link: /product/${product.slug}`,
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/* Context builder                                                     */
/* ------------------------------------------------------------------ */

export async function buildContext(message: string): Promise<ChatContext> {
  const intent = classifyIntent(message);

  if (intent === "order_status") {
    const match = message.match(/\bVLC-\d+\b/i);
    const orderNumber = match?.[0]?.toUpperCase();

    if (orderNumber) {
      const order = await getOrderByNumber(orderNumber);
      if (order) {
        const items = order.items
          .map((i) => `${i.nameSnapshot} (${i.colorSnapshot}, US ${formatSize(i.size)}) x${i.quantity}`)
          .join("; ");
        return {
          intent,
          orderNumber,
          products: [],
          facts: [
            `Order ${order.orderNumber} is currently "${order.status}".`,
            `Placed on ${order.createdAt.toDateString()}.`,
            `Items: ${items}.`,
            `Total: ${formatPrice(order.totalCents)}.`,
          ].join("\n"),
        };
      }
      return {
        intent,
        orderNumber,
        products: [],
        facts: `No order exists with the number ${orderNumber}. Ask the customer to double-check it, or point them to the My Orders page at /account/orders.`,
      };
    }

    return {
      intent,
      products: [],
      facts:
        "The customer has not given an order number. Ask for it (format: VLC-123456), or point them to /account/orders where every order is listed.",
    };
  }

  if (intent === "shipping") {
    return { intent, products: [], facts: POLICIES.shipping.join("\n") };
  }

  if (intent === "returns") {
    return { intent, products: [], facts: POLICIES.returns.join("\n") };
  }

  if (intent === "sizing") {
    return {
      intent,
      products: [],
      facts: [...POLICIES.sizing, ...POLICIES.warranty].join("\n"),
    };
  }

  if (intent === "product_search") {
    const hint = CATEGORY_HINTS.find(([pattern]) => pattern.test(message));
    const priceCap = parsePriceCap(message);
    const size = parseSize(message);

    let candidates = hint
      ? await getProducts(hint[1], { sort: "featured" })
      : await searchProducts(message, 12);

    // A bare "recommend me something" matches no category and no keywords.
    if (candidates.length === 0) {
      candidates = await getProducts(undefined, { sort: "featured" });
    }

    if (priceCap) {
      candidates = candidates.filter((p) => (p.salePriceCents ?? p.priceCents) <= priceCap);
    }

    const products = candidates.slice(0, 4);

    const constraints = [
      hint ? `Category: ${hint[1]}` : null,
      priceCap ? `Budget: at or under ${formatPrice(priceCap)}` : null,
      size ? `Requested size: US ${size}` : null,
    ].filter(Boolean);

    return {
      intent,
      products,
      facts: [
        constraints.length ? `Customer constraints — ${constraints.join("; ")}.` : "",
        products.length
          ? `Matching products from the Veloce catalogue:\n${products.map(describe).join("\n")}`
          : "No products in the catalogue match those constraints. Say so plainly and suggest relaxing the budget or trying another category.",
      ]
        .filter(Boolean)
        .join("\n\n"),
    };
  }

  // General: give the model just enough to orient the customer.
  const categories = flattenTaxonomy()
    .map((n) => `${n.name} (/shop/${n.path})`)
    .join(", ");

  return {
    intent,
    products: [],
    facts: [
      "Veloce is a performance footwear brand selling running, training, football and basketball shoes.",
      `Shop categories: ${categories}.`,
      "Useful links: /shop, /collections, /about, /account/orders, /wishlist, /cart.",
      ...POLICIES.shipping.slice(0, 2),
    ].join("\n"),
  };
}

/* ------------------------------------------------------------------ */

export const SYSTEM_PROMPT = `You are the shopping assistant for Veloce, a premium performance footwear brand.

Rules, without exception:
- Answer ONLY from the FACTS block supplied with each message. It is retrieved live from the Veloce database.
- If the FACTS do not cover the question, say you don't have that detail and suggest where to look. Never invent a product, price, size, stock level or policy.
- If the FACTS contain no product list, do NOT name any product at all — not even one you saw earlier in this conversation. Never write a heading like "Available products".
- Never mention other brands. Veloce shoes are the only shoes you know about.
- Be concise: two or three short sentences. This is a chat window, not an email.
- Warm and direct. No corporate filler, no "I'd be happy to assist you with that".
- Recommend at most two products, and say why. When you name one, give its price.
- Clickable product cards render automatically underneath your reply. Never restate them as a list, and never write a "Product cards:" or "Available products:" heading. Never paste a URL.
- State only what the FACTS say. Do not speculate about where a parcel is, when it will arrive, or what a customer should do next unless the FACTS say it.`;

export function isNegativeQuestion(message: string): boolean {
  const msg = message.toLowerCase();

  const negativeKeywords = [
    "bad",
    "terrible",
    "worst",
    "suck",
    "trash",
    "garbage",
    "scam",
    "fake",
    "ugly",
    "poor",
    "hate",
    "uncomfortable",
    "horrible",
    "dislike",
    "waste",
    "broken",
    "defect",
    "fail",
    "useless",
    "cheap",
  ];

  const hasNegativeKeyword = negativeKeywords.some((keyword) => {
    const regex = new RegExp("\\b" + keyword + "(s|d|y|ing)?\\b", "i");
    return regex.test(msg);
  });

  if (!hasNegativeKeyword) {
    return false;
  }

  const targetKeywords = [
    "veloce",
    "brand",
    "shoe",
    "boot",
    "sneaker",
    "trainer",
    "product",
    "service",
    "shipping",
    "delivery",
    "quality",
    "fit",
    "size",
    "you",
    "this",
    "they",
    "item",
  ];

  const hasTargetKeyword = targetKeywords.some((target) => {
    const regex = new RegExp("\\b" + target + "s?\\b", "i");
    return regex.test(msg);
  });

  return hasTargetKeyword;
}

export function isRelated(message: string): boolean {
  const msg = message.toLowerCase();

  // 1. Order status patterns
  if (/\bvlc-\d+\b/i.test(msg)) return true;
  if (/\b(order status|my orders?|track(ing)?)\b/i.test(msg)) return true;
  if (/where.{0,15}\b(order|parcel|package|delivery)\b/i.test(msg)) return true;

  // 2. Check if there are any match signals from SIGNALS
  const signalsPatterns = [
    /\b(returns?|refunds?|exchanges?|money back)\b|send.{0,10}back/i,
    /\b(ship|shipping|deliver(y|ed)?|postage|dispatch|courier)\b/i,
    /\bhow long.{0,20}(take|arrive|deliver)/i,
    /\b(true to size|size guide|sizing|fits?|fitting|narrow|wide|width|half size)\b/i,
    /\b(what|which|whats|what's) size\b/i,
    /\bruns? (big|small|large|narrow|wide)\b/i,
    /\bsizes?\b/i,
    /\b(recommend|suggest|looking for|show me|any good|best|top)\b/i,
    /\b(firm ground|soft ground|high top|mid top|running|training|football|soccer|basketball|marathon|gym|lifting)\b/i,
    /\b(under|below|less than|cheaper than|up to|budget|around)\s*\$?\s*\d+/i,
    /\b(shoes?|boots?|trainers?|sneakers?|cleats?|kicks)\b/i,
  ];

  if (signalsPatterns.some((pattern) => pattern.test(msg))) {
    return true;
  }

  // 3. Other Veloce/greeting/store related terms
  const relatedTerms = [
    /\bveloce\b/i,
    /\bhi\b/i,
    /\bhello\b/i,
    /\bhey\b/i,
    /\bhelp\b/i,
    /\bwho are you\b/i,
    /\bwhat (can|do) you do\b/i,
    /\bassistant\b/i,
    /\bsupport\b/i,
    /\bcustomer\b/i,
    /\bshop\b/i,
    /\bstore\b/i,
    /\bbuy\b/i,
    /\bprice\b/i,
    /\bcost\b/i,
    /\bcatalog\b/i,
    /\bwarranty\b/i,
    /\bguarantee\b/i,
    /\babout\b/i,
    /\b(sell|sold|socks?|apparel|clothing|gear|accessories?)\b/i,
    /\b(backpacks?|bags?|items?|products?)\b/i,
    /\b(compare|better|which|waterproof|dimensions?)\b/i,
    /\b(stock|available|inventory|back)\b/i,
    /\b(discount|coupon|save\d*|checkout|cart|add)\b/i,
    /\b(internationally|packages?|parcels?|human)\b/i,
    /\b(credit|card|saved|security|privacy)\b/i,
    /@/i,
  ];

  if (relatedTerms.some((pattern) => pattern.test(msg))) {
    return true;
  }

  return false;
}

