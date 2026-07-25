/** Store-wide default when a product has no `lowStockThreshold` of its own. */
export const DEFAULT_LOW_STOCK_THRESHOLD = 6;

/** A size row at or below this is treated as out of stock, not merely low. */
export const OUT_OF_STOCK_THRESHOLD = 0;

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Statuses that count toward revenue. Cancelled and refunded never do. */
export const REVENUE_STATUSES: readonly string[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
];

export const CONTENT_STATUSES = ["draft", "published", "archived"] as const;
export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
export const ADMIN_ROLES = ["owner", "admin", "editor"] as const;

export const GENDERS = ["men", "women", "unisex", "kids"] as const;

/** Full US size run offered across the catalogue. */
export const SIZE_RUN = [
  6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 14,
] as const;

export const PAGE_SIZE = 20;
