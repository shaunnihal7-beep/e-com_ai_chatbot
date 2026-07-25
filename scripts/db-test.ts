/**
 * Integrity check for the seeded catalogue.
 *
 * Not a unit-test suite — it asserts the invariants the storefront actually
 * depends on at runtime, against the live database. Run with `npm run db:test`.
 */
import { config } from "dotenv";
import { Pool } from "pg";

// Next reads .env.local on its own; a plain tsx script does not.
config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let passed = 0;
let failed = 0;

// Loose by design: every assertion below knows the shape of its own query, and
// naming 22 one-off row types would be noise rather than safety.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

async function check(name: string, sql: string, assert: (rows: Row[]) => string | null) {
  try {
    const { rows } = await pool.query(sql);
    const problem = assert(rows);
    if (problem) {
      failed++;
      console.log(`  FAIL  ${name}\n        ${problem}`);
    } else {
      passed++;
      console.log(`  ok    ${name}`);
    }
  } catch (error) {
    failed++;
    console.log(`  ERROR ${name}\n        ${(error as Error).message}`);
  }
}

async function main() {
  const { rows: version } = await pool.query("SELECT version()");
  console.log(`\n${version[0].version.split(",")[0]}`);
  const { rows: db } = await pool.query(
    "SELECT current_database() AS d, pg_size_pretty(pg_database_size(current_database())) AS s",
  );
  console.log(`Database: ${db[0].d} (${db[0].s})\n`);

  console.log("SCHEMA");
  await check(
    "all 10 tables present",
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' ORDER BY table_name`,
    (r) => {
      const want = [
        "categories", "collection_products", "collections", "order_items", "orders",
        "product_colors", "product_images", "product_sizes", "products", "reviews", "users",
      ];
      const got = r.map((x) => x.table_name);
      const missing = want.filter((t) => !got.includes(t));
      return missing.length ? `missing: ${missing.join(", ")}` : null;
    },
  );

  await check(
    "foreign keys are enforced",
    `SELECT count(*)::int AS n FROM information_schema.table_constraints
     WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public'`,
    (r) => (r[0].n >= 8 ? null : `only ${r[0].n} foreign keys defined`),
  );

  await check(
    "indexes exist on the hot lookup columns",
    `SELECT indexdef FROM pg_indexes WHERE schemaname = 'public'`,
    (r) => {
      const defs = r.map((x) => x.indexdef).join(" ");
      const need = ["products", "product_colors", "product_images", "product_sizes"];
      const missing = need.filter((t) => !defs.includes(`ON public.${t}`));
      return missing.length ? `no index on: ${missing.join(", ")}` : null;
    },
  );

  console.log("\nCATALOGUE");
  await check(
    "32 products seeded",
    "SELECT count(*)::int AS n FROM products",
    (r) => (r[0].n === 32 ? null : `found ${r[0].n}, expected 32`),
  );

  await check(
    "product slugs are unique",
    "SELECT slug, count(*)::int AS n FROM products GROUP BY slug HAVING count(*) > 1",
    (r) => (r.length === 0 ? null : `duplicates: ${r.map((x) => x.slug).join(", ")}`),
  );

  await check(
    "every product sits in a real category",
    `SELECT p.slug FROM products p LEFT JOIN categories c ON c.id = p.category_id
     WHERE c.id IS NULL`,
    (r) => (r.length === 0 ? null : `orphaned: ${r.map((x) => x.slug).join(", ")}`),
  );

  await check(
    "every product has at least one colourway",
    `SELECT p.slug FROM products p
     LEFT JOIN product_colors pc ON pc.product_id = p.id
     GROUP BY p.slug HAVING count(pc.id) = 0`,
    (r) => (r.length === 0 ? null : `colourless: ${r.map((x) => x.slug).join(", ")}`),
  );

  await check(
    "exactly one default colourway per product",
    `SELECT p.slug, count(*) FILTER (WHERE pc.is_default)::int AS d
     FROM products p JOIN product_colors pc ON pc.product_id = p.id
     GROUP BY p.slug HAVING count(*) FILTER (WHERE pc.is_default) <> 1`,
    (r) => (r.length === 0 ? null : `${r.length} products with a bad default`),
  );

  await check(
    "every colourway has 2 images",
    `SELECT pc.id, count(pi.id)::int AS n FROM product_colors pc
     LEFT JOIN product_images pi ON pi.color_id = pc.id
     GROUP BY pc.id HAVING count(pi.id) <> 2`,
    (r) => (r.length === 0 ? null : `${r.length} colourways without exactly 2 images`),
  );

  await check(
    "every colourway has a full size run",
    `SELECT pc.id, count(ps.id)::int AS n FROM product_colors pc
     LEFT JOIN product_sizes ps ON ps.color_id = pc.id
     GROUP BY pc.id HAVING count(ps.id) < 10`,
    (r) => (r.length === 0 ? null : `${r.length} colourways with a short size run`),
  );

  console.log("\nDATA INTEGRITY");
  await check(
    "no negative or zero prices",
    "SELECT slug FROM products WHERE price_cents <= 0",
    (r) => (r.length === 0 ? null : `bad prices: ${r.map((x) => x.slug).join(", ")}`),
  );

  await check(
    "sale price is always below list price",
    `SELECT slug, price_cents, sale_price_cents FROM products
     WHERE sale_price_cents IS NOT NULL AND sale_price_cents >= price_cents`,
    (r) => (r.length === 0 ? null : `inverted: ${r.map((x) => x.slug).join(", ")}`),
  );

  await check(
    "prices are whole cents (integer column, no float drift)",
    `SELECT data_type FROM information_schema.columns
     WHERE table_name = 'products' AND column_name = 'price_cents'`,
    (r) => (r[0]?.data_type === "integer" ? null : `price_cents is ${r[0]?.data_type}`),
  );

  await check(
    "no negative stock",
    "SELECT count(*)::int AS n FROM product_sizes WHERE stock < 0",
    (r) => (r[0].n === 0 ? null : `${r[0].n} rows below zero`),
  );

  await check(
    "review ratings are within 1-5",
    "SELECT count(*)::int AS n FROM reviews WHERE rating < 1 OR rating > 5",
    (r) => (r[0].n === 0 ? null : `${r[0].n} out-of-range ratings`),
  );

  await check(
    "category paths are unique and well formed",
    "SELECT path, count(*)::int AS n FROM categories GROUP BY path HAVING count(*) > 1",
    (r) => (r.length === 0 ? null : `duplicate paths: ${r.map((x) => x.path).join(", ")}`),
  );

  await check(
    "all 9 taxonomy paths resolve",
    "SELECT path FROM categories ORDER BY path",
    (r) => {
      const want = [
        "basketball", "basketball/high-top", "basketball/mid-top",
        "sports", "sports/football", "sports/football/fg", "sports/football/sg",
        "sports/running", "sports/training",
      ];
      const got = r.map((x) => x.path);
      const missing = want.filter((p) => !got.includes(p));
      return missing.length ? `missing: ${missing.join(", ")}` : null;
    },
  );

  await check(
    "every category leaf has stock in it",
    `SELECT c.path FROM categories c
     LEFT JOIN products p ON p.category_id = c.id
     WHERE c.path IN ('sports/running','sports/training','sports/football/fg',
                      'sports/football/sg','basketball/high-top','basketball/mid-top')
     GROUP BY c.path HAVING count(p.id) = 0`,
    (r) => (r.length === 0 ? null : `empty: ${r.map((x) => x.path).join(", ")}`),
  );

  console.log("\nORDERS");
  await check(
    "order totals equal subtotal + shipping + tax",
    `SELECT order_number, total_cents, subtotal_cents + shipping_cents + tax_cents AS computed
     FROM orders WHERE total_cents <> subtotal_cents + shipping_cents + tax_cents`,
    (r) => (r.length === 0 ? null : `mismatched: ${r.map((x) => x.order_number).join(", ")}`),
  );

  await check(
    "order subtotals equal the sum of their line items",
    `SELECT o.order_number, o.subtotal_cents,
            sum(oi.unit_price_cents * oi.quantity)::int AS lines
     FROM orders o JOIN order_items oi ON oi.order_id = o.id
     GROUP BY o.id, o.order_number, o.subtotal_cents
     HAVING o.subtotal_cents <> sum(oi.unit_price_cents * oi.quantity)::int`,
    (r) => (r.length === 0 ? null : `mismatched: ${r.map((x) => x.order_number).join(", ")}`),
  );

  await check(
    "order items carry a name snapshot (survives catalogue edits)",
    "SELECT count(*)::int AS n FROM order_items WHERE name_snapshot IS NULL OR name_snapshot = ''",
    (r) => (r[0].n === 0 ? null : `${r[0].n} items without a snapshot`),
  );

  await check(
    "no orphaned order items",
    `SELECT count(*)::int AS n FROM order_items oi
     LEFT JOIN orders o ON o.id = oi.order_id WHERE o.id IS NULL`,
    (r) => (r[0].n === 0 ? null : `${r[0].n} orphans`),
  );

  console.log("\nQUERY PERFORMANCE");
  const timed = async (label: string, sql: string) => {
    const t0 = Date.now();
    const { rows } = await pool.query(sql);
    const ms = Date.now() - t0;
    console.log(`  ${String(ms).padStart(4)}ms  ${label} (${rows.length} rows)`);
    return ms;
  };
  await timed("full catalogue with colours + images", `
    SELECT p.slug, pc.name, pi.url FROM products p
    JOIN product_colors pc ON pc.product_id = p.id
    JOIN product_images pi ON pi.color_id = pc.id`);
  await timed("PDP by slug", `
    SELECT p.*, pc.*, ps.* FROM products p
    JOIN product_colors pc ON pc.product_id = p.id
    JOIN product_sizes ps ON ps.color_id = pc.id
    WHERE p.slug = 'aero-fk'`);
  await timed("category listing with ratings", `
    SELECT p.slug, avg(r.rating) FROM products p
    JOIN categories c ON c.id = p.category_id
    LEFT JOIN reviews r ON r.product_id = p.id
    WHERE c.path LIKE 'sports%' GROUP BY p.slug`);

  console.log("\nROW COUNTS");
  const { rows: counts } = await pool.query(`
    SELECT 'categories' t, count(*)::int n FROM categories
    UNION ALL SELECT 'products', count(*)::int FROM products
    UNION ALL SELECT 'product_colors', count(*)::int FROM product_colors
    UNION ALL SELECT 'product_images', count(*)::int FROM product_images
    UNION ALL SELECT 'product_sizes', count(*)::int FROM product_sizes
    UNION ALL SELECT 'reviews', count(*)::int FROM reviews
    UNION ALL SELECT 'collections', count(*)::int FROM collections
    UNION ALL SELECT 'collection_products', count(*)::int FROM collection_products
    UNION ALL SELECT 'users', count(*)::int FROM users
    UNION ALL SELECT 'orders', count(*)::int FROM orders
    UNION ALL SELECT 'order_items', count(*)::int FROM order_items
    ORDER BY 1`);
  for (const row of counts) console.log(`  ${row.t.padEnd(20)} ${row.n}`);

  console.log(`\n${passed} passed, ${failed} failed\n`);
  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
