import { ProductCard } from "./product-card";
import type { ProductCard as ProductCardType } from "@/lib/types";

/**
 * The catalogue grid: 4 columns on desktop, 2 on tablet and mobile.
 *
 * The first four cards get `priority` so the LCP image on any listing page is
 * fetched eagerly rather than lazily.
 */
export function ProductGrid({
  products,
  className,
}: {
  products: ProductCardType[];
  className?: string;
}) {
  return (
    <div
      className={
        className ??
        "grid grid-cols-2 gap-x-3 gap-y-10 md:gap-x-5 md:gap-y-14 xl:grid-cols-4"
      }
    >
      {products.map((product, i) => (
        <ProductCard key={product.id} product={product} index={i} priority={i < 4} />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-28 text-center">
      <h2 className="text-display-md">{title}</h2>
      <p className="mt-4 max-w-md text-muted-foreground">{message}</p>
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
