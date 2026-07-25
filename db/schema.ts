import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * All money is stored as integer cents. Formatting happens in one place —
 * lib/format.ts — so no float arithmetic ever touches a price.
 */

/* ------------------------------------------------------------------ */
/* Taxonomy                                                            */
/* ------------------------------------------------------------------ */

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    // Full URL path below /shop, e.g. "sports/football/fg". Unique, and the
    // only thing the catch-all route needs to resolve a page.
    path: text("path").notNull(),
    name: text("name").notNull(),
    tagline: text("tagline"),
    description: text("description"),
    parentId: integer("parent_id"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("categories_path_idx").on(t.path)],
);

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "parentChild",
  }),
  children: many(categories, { relationName: "parentChild" }),
  products: many(products),
}));

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    subtitle: text("subtitle").notNull(),
    description: text("description").notNull(),
    // Longer-form copy for the PDP "technology" accordion.
    story: text("story"),
    priceCents: integer("price_cents").notNull(),
    salePriceCents: integer("sale_price_cents"),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    gender: text("gender").notNull().default("unisex"),
    isNew: boolean("is_new").notNull().default(false),
    isBestSeller: boolean("is_best_seller").notNull().default(false),
    technologies: text("technologies").array().notNull().default([]),
    weightGrams: integer("weight_grams"),
    dropMm: real("drop_mm"),
    /* --- CMS fields ------------------------------------------------- */
    // draft | published | archived. The storefront shows "published" only;
    // every public query filters on it, so unpublishing is a real takedown.
    status: text("status").notNull().default("published"),
    sku: text("sku"),
    // Per-product override for the inventory alert threshold. Null falls back
    // to the store-wide default in lib/admin/constants.ts.
    lowStockThreshold: integer("low_stock_threshold"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    publishedAt: timestamp("published_at"),
    archivedAt: timestamp("archived_at"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("products_slug_idx").on(t.slug),
    index("products_category_idx").on(t.categoryId),
    index("products_status_idx").on(t.status),
  ],
);

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  colors: many(productColors),
  reviews: many(reviews),
  collections: many(collectionProducts),
}));

export const productColors = pgTable(
  "product_colors",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    // Swatch fill shown on the product card.
    hex: text("hex").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("product_colors_product_idx").on(t.productId)],
);

export const productColorsRelations = relations(productColors, ({ one, many }) => ({
  product: one(products, {
    fields: [productColors.productId],
    references: [products.id],
  }),
  images: many(productImages),
  sizes: many(productSizes),
}));

export const productImages = pgTable(
  "product_images",
  {
    id: serial("id").primaryKey(),
    colorId: integer("color_id")
      .notNull()
      .references(() => productColors.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt").notNull(),
    // sortOrder 0 = primary card image, 1 = the hover swap.
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("product_images_color_idx").on(t.colorId)],
);

export const productImagesRelations = relations(productImages, ({ one }) => ({
  color: one(productColors, {
    fields: [productImages.colorId],
    references: [productColors.id],
  }),
}));

export const productSizes = pgTable(
  "product_sizes",
  {
    id: serial("id").primaryKey(),
    colorId: integer("color_id")
      .notNull()
      .references(() => productColors.id, { onDelete: "cascade" }),
    // US sizing, half sizes included — hence real, not integer.
    size: real("size").notNull(),
    stock: integer("stock").notNull().default(0),
  },
  (t) => [index("product_sizes_color_idx").on(t.colorId)],
);

export const productSizesRelations = relations(productSizes, ({ one }) => ({
  color: one(productColors, {
    fields: [productSizes.colorId],
    references: [productColors.id],
  }),
}));

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    author: text("author").notNull(),
    email: text("email"),
    rating: integer("rating").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    verified: boolean("verified").notNull().default(true),
    /* --- Moderation --------------------------------------------------- */
    // pending | approved | rejected. Only "approved" reaches the PDP.
    status: text("status").notNull().default("approved"),
    // Customer-submitted photos, stored as public URLs.
    images: text("images").array().notNull().default([]),
    // A single store reply per review, shown beneath it on the PDP.
    reply: text("reply"),
    replyAuthor: text("reply_author"),
    repliedAt: timestamp("replied_at"),
    moderatedAt: timestamp("moderated_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("reviews_product_idx").on(t.productId),
    index("reviews_status_idx").on(t.status),
  ],
);

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
}));

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

export const collections = pgTable(
  "collections",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    tagline: text("tagline").notNull(),
    description: text("description").notNull(),
    heroImage: text("hero_image"),
    isFeatured: boolean("is_featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("collections_slug_idx").on(t.slug)],
);

export const collectionProducts = pgTable(
  "collection_products",
  {
    collectionId: integer("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.collectionId, t.productId] })],
);

export const collectionsRelations = relations(collections, ({ many }) => ({
  products: many(collectionProducts),
}));

export const collectionProductsRelations = relations(collectionProducts, ({ one }) => ({
  collection: one(collections, {
    fields: [collectionProducts.collectionId],
    references: [collections.id],
  }),
  product: one(products, {
    fields: [collectionProducts.productId],
    references: [products.id],
  }),
}));

/* ------------------------------------------------------------------ */
/* Accounts & orders                                                   */
/* ------------------------------------------------------------------ */

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    // Mock auth: hashed, but the login path accepts any password by design.
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    orderNumber: text("order_number").notNull(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    status: text("status").notNull().default("confirmed"),
    subtotalCents: integer("subtotal_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    shippingAddress: jsonb("shipping_address").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("orders_number_idx").on(t.orderNumber),
    index("orders_user_idx").on(t.userId),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    // Snapshots so a past order still renders correctly after a catalog edit.
    nameSnapshot: text("name_snapshot").notNull(),
    colorSnapshot: text("color_snapshot").notNull(),
    imageSnapshot: text("image_snapshot").notNull(),
    slugSnapshot: text("slug_snapshot").notNull(),
    size: real("size").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));

/* ------------------------------------------------------------------ */
/* CMS — admin accounts                                                */
/* ------------------------------------------------------------------ */

/**
 * Deliberately separate from `users`. Storefront auth is mocked (any password
 * works); admin auth is not — the hash here is always verified with bcrypt.
 * Keeping the tables apart means a customer account can never become an admin
 * one by accident, and the mock path can stay mocked.
 */
export const adminUsers = pgTable(
  "admin_users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    // owner | admin | editor. Editors cannot manage other admins.
    role: text("role").notNull().default("editor"),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("admin_users_email_idx").on(t.email)],
);

/**
 * Append-only audit trail. Powers the dashboard activity feed and gives every
 * destructive action a name attached to it.
 */
export const activityLog = pgTable(
  "activity_log",
  {
    id: serial("id").primaryKey(),
    actorId: integer("actor_id").references(() => adminUsers.id, {
      onDelete: "set null",
    }),
    // Denormalised so the feed still reads correctly after an admin is removed.
    actorName: text("actor_name").notNull(),
    // created | updated | deleted | published | unpublished | archived | ...
    action: text("action").notNull(),
    // product | review | post | page | order | admin
    entityType: text("entity_type").notNull(),
    entityId: integer("entity_id"),
    summary: text("summary").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("activity_log_created_idx").on(t.createdAt)],
);

/* ------------------------------------------------------------------ */
/* CMS — blog                                                          */
/* ------------------------------------------------------------------ */

export const blogCategories = pgTable(
  "blog_categories",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("blog_categories_slug_idx").on(t.slug)],
);

export const blogTags = pgTable(
  "blog_tags",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
  },
  (t) => [uniqueIndex("blog_tags_slug_idx").on(t.slug)],
);

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt"),
    // Markdown. Rendered by lib/markdown.ts, which escapes before formatting.
    body: text("body").notNull(),
    coverImage: text("cover_image"),
    status: text("status").notNull().default("draft"),
    categoryId: integer("category_id").references(() => blogCategories.id, {
      onDelete: "set null",
    }),
    authorId: integer("author_id").references(() => adminUsers.id, {
      onDelete: "set null",
    }),
    authorName: text("author_name").notNull().default("Veloce"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    publishedAt: timestamp("published_at"),
    archivedAt: timestamp("archived_at"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("blog_posts_slug_idx").on(t.slug),
    index("blog_posts_status_idx").on(t.status),
  ],
);

export const blogPostTags = pgTable(
  "blog_post_tags",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => blogTags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] })],
);

export const blogPostsRelations = relations(blogPosts, ({ one, many }) => ({
  category: one(blogCategories, {
    fields: [blogPosts.categoryId],
    references: [blogCategories.id],
  }),
  tags: many(blogPostTags),
}));

export const blogCategoriesRelations = relations(blogCategories, ({ many }) => ({
  posts: many(blogPosts),
}));

export const blogTagsRelations = relations(blogTags, ({ many }) => ({
  posts: many(blogPostTags),
}));

export const blogPostTagsRelations = relations(blogPostTags, ({ one }) => ({
  post: one(blogPosts, { fields: [blogPostTags.postId], references: [blogPosts.id] }),
  tag: one(blogTags, { fields: [blogPostTags.tagId], references: [blogTags.id] }),
}));

/* ------------------------------------------------------------------ */
/* CMS — static pages                                                  */
/* ------------------------------------------------------------------ */

/**
 * About / Contact / Privacy / Terms / FAQ and anything else the store needs.
 * Served by the catch-all route app/(storefront)/[slug]/page.tsx, which sits
 * last in the routing order so it never shadows a real route.
 */
export const pages = pgTable(
  "pages",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    // Markdown, same renderer as blog posts.
    body: text("body").notNull(),
    // page | faq — "faq" renders the body's "## question" blocks as accordions.
    template: text("template").notNull().default("page"),
    status: text("status").notNull().default("draft"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    // Pages with showInFooter render in the footer's "Company" column.
    showInFooter: boolean("show_in_footer").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    publishedAt: timestamp("published_at"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("pages_slug_idx").on(t.slug)],
);

/* ------------------------------------------------------------------ */

export type Product = typeof products.$inferSelect;
export type ProductColor = typeof productColors.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
export type ProductSize = typeof productSizes.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type User = typeof users.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type ActivityEntry = typeof activityLog.$inferSelect;
export type BlogPost = typeof blogPosts.$inferSelect;
export type BlogCategory = typeof blogCategories.$inferSelect;
export type BlogTag = typeof blogTags.$inferSelect;
export type Page = typeof pages.$inferSelect;

/** Lifecycle shared by products, posts and pages. */
export type ContentStatus = "draft" | "published" | "archived";
export type ReviewStatus = "pending" | "approved" | "rejected";
export type AdminRole = "owner" | "admin" | "editor";
