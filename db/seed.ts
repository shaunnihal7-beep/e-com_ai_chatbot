/**
 * Seeds the catalogue from scripts/catalog.ts.
 *
 * Idempotent: truncates everything first, so `npm run db:seed` can be re-run
 * at any point without duplicating rows. Run with: npm run db:seed
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

import * as s from "./schema";
import { taxonomy } from "../lib/taxonomy";
import {
  demoUser,
  reviewsFor,
  seedCollections,
  seedProducts,
  sizesForCategory,
  stockFor,
} from "../scripts/catalog";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema: s });

type Manifest = Record<string, { images: { url: string; alt: string }[] }>;

function loadManifest(): Manifest {
  const p = path.join(process.cwd(), "scripts", "generated", "images.json");
  if (!fs.existsSync(p)) {
    console.warn("! No image manifest found — run `npm run images` first.");
    return {};
  }
  return JSON.parse(fs.readFileSync(p, "utf8")) as Manifest;
}

async function main() {
  const manifest = loadManifest();

  console.log("Clearing existing data...");
  await db.execute(sql`
    TRUNCATE TABLE
      order_items, orders, users,
      collection_products, collections,
      reviews, product_sizes, product_images, product_colors,
      products, categories
    RESTART IDENTITY CASCADE
  `);

  /* ---------------- Categories ---------------- */

  console.log("Seeding categories...");
  const categoryIdByPath = new Map<string, number>();

  // Insert breadth-first so a parent always exists before its children.
  async function insertLevel(nodes: typeof taxonomy, parentId: number | null) {
    for (const [i, node] of nodes.entries()) {
      const [row] = await db
        .insert(s.categories)
        .values({
          slug: node.slug,
          path: node.path,
          name: node.name,
          tagline: node.tagline,
          description: node.description,
          parentId,
          sortOrder: i,
        })
        .returning({ id: s.categories.id });
      categoryIdByPath.set(node.path, row.id);
      if (node.children?.length) await insertLevel(node.children, row.id);
    }
  }
  await insertLevel(taxonomy, null);
  console.log(`  ${categoryIdByPath.size} categories`);

  /* ---------------- Products ---------------- */

  console.log("Seeding products...");
  const productIdBySlug = new Map<string, number>();
  let colorCount = 0;
  let imageCount = 0;
  let sizeCount = 0;
  let reviewCount = 0;

  for (const p of seedProducts) {
    const categoryId = categoryIdByPath.get(p.categoryPath);
    if (!categoryId) throw new Error(`Unknown category path: ${p.categoryPath}`);

    const [product] = await db
      .insert(s.products)
      .values({
        slug: p.slug,
        name: p.name,
        subtitle: p.subtitle,
        description: p.description,
        story: p.story,
        priceCents: p.priceCents,
        salePriceCents: p.salePriceCents ?? null,
        categoryId,
        isNew: p.isNew ?? false,
        isBestSeller: p.isBestSeller ?? false,
        technologies: p.technologies,
        weightGrams: p.weightGrams,
        dropMm: p.dropMm,
      })
      .returning({ id: s.products.id });

    productIdBySlug.set(p.slug, product.id);

    for (const [ci, color] of p.colors.entries()) {
      const [row] = await db
        .insert(s.productColors)
        .values({
          productId: product.id,
          name: color.name,
          slug: color.slug,
          hex: color.hex,
          isDefault: ci === 0,
          sortOrder: ci,
        })
        .returning({ id: s.productColors.id });
      colorCount++;

      // Images come from the manifest; fall back to the naming convention so
      // a partial image run still produces a working catalogue.
      const entry = manifest[`${p.slug}/${color.slug}`];
      const images =
        entry && entry.images.length > 0
          ? entry.images
          : [1, 2].map((n) => ({
              url: `/products/${p.slug}/${color.slug}-${n}.jpg`,
              alt: `${p.name} in ${color.name}, view ${n}`,
            }));

      for (const [ii, img] of images.entries()) {
        await db.insert(s.productImages).values({
          colorId: row.id,
          url: img.url,
          alt: img.alt,
          sortOrder: ii,
        });
        imageCount++;
      }

      for (const size of sizesForCategory(p.categoryPath)) {
        await db.insert(s.productSizes).values({
          colorId: row.id,
          size,
          stock: stockFor(p.slug, color.slug, size),
        });
        sizeCount++;
      }
    }

    for (const r of reviewsFor(p.slug)) {
      await db.insert(s.reviews).values({
        productId: product.id,
        author: r.author,
        rating: r.rating,
        title: r.title,
        body: r.body,
        verified: r.verified,
        createdAt: r.createdAt,
      });
      reviewCount++;
    }
  }

  console.log(
    `  ${seedProducts.length} products, ${colorCount} colourways, ${imageCount} images, ${sizeCount} sizes, ${reviewCount} reviews`,
  );

  /* ---------------- Collections ---------------- */

  console.log("Seeding collections...");
  for (const [i, c] of seedCollections.entries()) {
    const [row] = await db
      .insert(s.collections)
      .values({
        slug: c.slug,
        name: c.name,
        tagline: c.tagline,
        description: c.description,
        isFeatured: c.isFeatured,
        sortOrder: i,
        heroImage: null,
      })
      .returning({ id: s.collections.id });

    for (const [pi, slug] of c.productSlugs.entries()) {
      const productId = productIdBySlug.get(slug);
      if (!productId) throw new Error(`Collection ${c.slug} references unknown ${slug}`);
      await db
        .insert(s.collectionProducts)
        .values({ collectionId: row.id, productId, sortOrder: pi });
    }
  }
  console.log(`  ${seedCollections.length} collections`);

  /* ---------------- Demo account & order history ---------------- */

  console.log("Seeding demo account...");
  const [user] = await db
    .insert(s.users)
    .values({
      email: demoUser.email,
      name: demoUser.name,
      passwordHash: await bcrypt.hash(demoUser.password, 10),
    })
    .returning({ id: s.users.id });

  const demoOrders = [
    { slugs: ["aero-fk", "anchor-lift"], daysAgo: 12, status: "delivered" },
    { slugs: ["vantage-fg"], daysAgo: 41, status: "delivered" },
    { slugs: ["vertex-ht", "glide-mt"], daysAgo: 3, status: "shipped" },
  ];

  for (const [i, o] of demoOrders.entries()) {
    const items = o.slugs.map((slug) => {
      const p = seedProducts.find((x) => x.slug === slug)!;
      const color = p.colors[0];
      return {
        productId: productIdBySlug.get(slug)!,
        nameSnapshot: p.name,
        colorSnapshot: color.name,
        slugSnapshot: p.slug,
        imageSnapshot: `/products/${p.slug}/${color.slug}-1.jpg`,
        size: 9,
        quantity: 1,
        unitPriceCents: p.salePriceCents ?? p.priceCents,
      };
    });

    const subtotal = items.reduce((sum, it) => sum + it.unitPriceCents * it.quantity, 0);
    const shipping = subtotal >= 15000 ? 0 : 995;
    const tax = Math.round(subtotal * 0.08);

    const [order] = await db
      .insert(s.orders)
      .values({
        orderNumber: `VLC-${String(100234 + i * 137)}`,
        userId: user.id,
        email: demoUser.email,
        status: o.status,
        subtotalCents: subtotal,
        shippingCents: shipping,
        taxCents: tax,
        totalCents: subtotal + shipping + tax,
        shippingAddress: {
          name: demoUser.name,
          line1: "48 Rivington Street",
          city: "London",
          postcode: "EC2A 3QP",
          country: "United Kingdom",
        },
        createdAt: new Date(Date.now() - o.daysAgo * 24 * 60 * 60 * 1000),
      })
      .returning({ id: s.orders.id });

    for (const it of items) {
      await db.insert(s.orderItems).values({ orderId: order.id, ...it });
    }
  }
  console.log(`  1 demo user (${demoUser.email} / ${demoUser.password}), ${demoOrders.length} orders`);

  console.log("\nSeed complete.");
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
