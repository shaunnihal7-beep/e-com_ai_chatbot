/** Single source of truth for currency. Change locale/currency here only. */
const CURRENCY = "USD";
const LOCALE = "en-US";

const formatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const preciseFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Prices are integer cents everywhere in the DB. */
export function formatPrice(cents: number): string {
  return cents % 100 === 0
    ? formatter.format(cents / 100)
    : preciseFormatter.format(cents / 100);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function discountPercent(price: number, salePrice: number): number {
  return Math.round(((price - salePrice) / price) * 100);
}

/** US half-sizes render as "9.5", whole sizes as "9". */
export function formatSize(size: number): string {
  return Number.isInteger(size) ? String(size) : size.toFixed(1);
}
