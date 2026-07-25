/** Shared view-model shapes. Queries in lib/queries return these, never raw rows. */

export type ColorSummary = {
  id: number;
  name: string;
  slug: string;
  hex: string;
  isDefault: boolean;
  /** [primary, hover] — always at least one entry. */
  images: { url: string; alt: string }[];
};

export type ProductCard = {
  id: number;
  slug: string;
  name: string;
  subtitle: string;
  priceCents: number;
  salePriceCents: number | null;
  isNew: boolean;
  isBestSeller: boolean;
  categoryPath: string;
  categoryName: string;
  rating: number;
  reviewCount: number;
  colors: ColorSummary[];
  technologies: string[];
};

export type SizeOption = {
  size: number;
  stock: number;
};

export type ColorDetail = ColorSummary & {
  sizes: SizeOption[];
};

export type ReviewView = {
  id: number;
  author: string;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  images: string[];
  reply: string | null;
  replyAuthor: string | null;
  createdAt: Date;
};

export type ProductDetail = Omit<ProductCard, "colors"> & {
  description: string;
  story: string | null;
  weightGrams: number | null;
  dropMm: number | null;
  colors: ColorDetail[];
  reviews: ReviewView[];
  ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number>;
};

export type SortKey =
  | "featured"
  | "newest"
  | "price-asc"
  | "price-desc"
  | "rating";

export type ProductFilters = {
  sizes?: number[];
  colors?: string[];
  minPrice?: number;
  maxPrice?: number;
  onSale?: boolean;
  sort?: SortKey;
};

export type CartLine = {
  productId: number;
  slug: string;
  name: string;
  colorSlug: string;
  colorName: string;
  size: number;
  quantity: number;
  unitPriceCents: number;
  image: string;
};
