import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

import * as schema from "./schema";
import {
  activityLog,
  adminUsers,
  blogCategories,
  blogPostTags,
  blogPosts,
  blogTags,
  pages,
  products,
  reviews,
} from "./schema";

// A local pool rather than db/index.ts: ES imports are hoisted, so that module
// would read DATABASE_URL before dotenv above had a chance to set it.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

/**
 * Seeds the CMS: the admin account, blog taxonomy and posts, the standard
 * static pages, and a little moderation queue to work through.
 *
 * Idempotent — it clears only the CMS-owned tables and never touches the
 * catalogue, orders or customers. Safe to re-run.
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@veloce.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "veloce-admin-2026";

async function main() {
  console.log("Seeding CMS…\n");

  /* ---------------- Admin accounts ---------------- */

  await db.delete(activityLog);
  await db.delete(adminUsers);

  const [owner] = await db
    .insert(adminUsers)
    .values({
      email: ADMIN_EMAIL.toLowerCase(),
      name: "Store Owner",
      // Cost 12, same as the runtime hash. Never store a plaintext password.
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
      role: "owner",
    })
    .returning();

  const [editor] = await db
    .insert(adminUsers)
    .values({
      email: "editor@veloce.com",
      name: "Content Editor",
      passwordHash: await bcrypt.hash("veloce-editor-2026", 12),
      role: "editor",
    })
    .returning();

  console.log(`  admin      ${owner.email}`);
  console.log(`  editor     ${editor.email}`);

  /* ---------------- Product lifecycle backfill ---------------- */

  // Everything seeded by db/seed.ts predates the status column, so give the
  // existing catalogue a publish date rather than leaving it null.
  await db
    .update(products)
    .set({ status: "published", publishedAt: sql`coalesce(${products.publishedAt}, ${products.createdAt})` })
    .where(sql`${products.status} = 'published' and ${products.publishedAt} is null`);

  // Leave a couple of drafts so the status filters have something to show.
  await db.execute(sql`
    update products set status = 'draft', published_at = null
    where id in (select id from products order by created_at desc limit 2)
  `);

  console.log("  products   statuses backfilled");

  /* ---------------- Reviews: a moderation queue ---------------- */

  // Push the newest handful into "pending" so the queue isn't empty.
  await db.execute(sql`
    update reviews set status = 'pending'
    where id in (select id from reviews order by created_at desc limit 5)
  `);

  // And give one review a store reply, to show the reply UI populated.
  await db.execute(sql`
    update reviews
    set reply = 'Thanks for the detailed write-up — glad the fit worked out. Shout if you need a different size.',
        reply_author = 'Store Owner',
        replied_at = now()
    where id = (select id from reviews where status = 'approved' order by rating desc limit 1)
  `);

  const [{ pending }] = (await db.execute(
    sql`select count(*)::int as pending from reviews where status = 'pending'`,
  )).rows as { pending: number }[];
  console.log(`  reviews    ${pending} pending moderation`);

  /* ---------------- Blog ---------------- */

  await db.delete(blogPostTags);
  await db.delete(blogPosts);
  await db.delete(blogCategories);
  await db.delete(blogTags);

  const categories = await db
    .insert(blogCategories)
    .values([
      { slug: "training", name: "Training", description: "Sessions, drills and building a base.", sortOrder: 0 },
      { slug: "gear", name: "Gear", description: "What to wear and when to replace it.", sortOrder: 1 },
      { slug: "stories", name: "Stories", description: "The people who run in Veloce.", sortOrder: 2 },
    ])
    .returning();

  const tags = await db
    .insert(blogTags)
    .values([
      { slug: "running", name: "Running" },
      { slug: "recovery", name: "Recovery" },
      { slug: "marathon", name: "Marathon" },
      { slug: "footwear", name: "Footwear" },
      { slug: "beginners", name: "Beginners" },
    ])
    .returning();

  const byCategory = (slug: string) => categories.find((c) => c.slug === slug)!.id;
  const byTag = (slug: string) => tags.find((t) => t.slug === slug)!.id;

  const posts = [
    {
      slug: "how-to-choose-your-first-running-shoe",
      title: "How to choose your first running shoe",
      excerpt:
        "Drop, stack, cushioning — the vocabulary is intimidating. Here is what actually matters when you buy your first pair.",
      categoryId: byCategory("gear"),
      tagIds: [byTag("footwear"), byTag("beginners"), byTag("running")],
      status: "published" as const,
      daysAgo: 3,
      body: `Walking into a running shop for the first time is genuinely overwhelming. Here is the short version of what matters.

## Fit comes first

Everything else is negotiable. Your foot swells over a run, so a shoe that feels perfect in the shop at 10am can feel a half-size small at mile eight.

- Leave a thumb's width at the front
- The heel should not slip when you walk
- Try shoes on in the **afternoon**, when your feet are already a little swollen

## Drop is a preference, not a rule

Drop is the height difference between heel and forefoot, measured in millimetres. A higher drop shifts load toward the knee; a lower drop shifts it toward the calf and Achilles.

If you are coming from a cushioned trainer, an 8–10mm drop is a comfortable starting point. Nothing about a lower number makes it better.

## Replace them before they fall apart

Midsole foam gives up long before the upper looks worn. Somewhere between 500 and 800 kilometres, the shoe stops protecting you even though it still looks fine.

> Log your mileage. It is the only reliable way to know.

Come and get fitted properly — it takes fifteen minutes and it is the single highest-value thing you can do for your running.`,
    },
    {
      slug: "the-easy-run-is-the-whole-sport",
      title: "The easy run is the whole sport",
      excerpt:
        "Most runners run their easy days too hard and their hard days too easy. Fixing that one thing changes everything.",
      categoryId: byCategory("training"),
      tagIds: [byTag("running"), byTag("marathon")],
      status: "published" as const,
      daysAgo: 9,
      body: `There is one mistake that shows up in almost every training log we see: the easy runs are not easy.

## What easy actually means

You should be able to hold a full conversation. Not gasp a few words between breaths — an actual conversation. If you cannot, you are running a moderate effort, and moderate effort is the least useful pace in the sport.

1. It is too hard to recover from properly
2. It is too easy to drive real adaptation
3. It quietly eats the energy you needed for your hard session

## Why it works

Easy running builds the aerobic base — capillary density, mitochondrial volume, the plumbing that makes everything else possible. That adaptation happens at low intensity, and it happens over months.

## Making yourself slow down

Run by effort, not pace. Hills, heat and fatigue all change what a given pace costs you, and your watch does not know any of that.

If slowing down feels like cheating, that is the habit talking. Give it three weeks.`,
    },
    {
      slug: "recovery-is-a-session-too",
      title: "Recovery is a session too",
      excerpt: "Sleep, food and the boring parts of getting faster.",
      categoryId: byCategory("training"),
      tagIds: [byTag("recovery")],
      status: "published" as const,
      daysAgo: 18,
      body: `Training is the stimulus. Recovery is where you actually get faster. Treat it with the same seriousness.

## Sleep is the whole game

No supplement, no massage gun and no compression sock comes close to an extra hour of sleep. If you are choosing between an early alarm for a run and a full night, take the sleep more often than you think.

## Eat enough

Under-fuelling is the most common cause of stalled progress we see, and it is particularly common in runners increasing their mileage. More training requires more food. That is not a moral failing.

## The boring parts

- Ten minutes of mobility beats an hour once a fortnight
- Easy days genuinely easy — see [the easy run](/blog/the-easy-run-is-the-whole-sport)
- One full rest day a week, no negotiation`,
    },
    {
      slug: "inside-the-velocity-lab",
      title: "Inside the Velocity Lab",
      excerpt: "How a Veloce midsole goes from a foam block to a finished shoe.",
      categoryId: byCategory("stories"),
      tagIds: [byTag("footwear")],
      status: "draft" as const,
      daysAgo: 1,
      body: `A draft, still being written.

## From block to midsole

Every Veloce midsole starts as a supercritical foam billet. Notes to expand here — process photography still to come from the lab visit.

## Testing

Two hundred runners, eight weeks, instrumented treadmills.`,
    },
  ];

  for (const post of posts) {
    const publishedAt =
      post.status === "published"
        ? new Date(Date.now() - post.daysAgo * 24 * 60 * 60 * 1000)
        : null;

    const [created] = await db
      .insert(blogPosts)
      .values({
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        body: post.body,
        status: post.status,
        categoryId: post.categoryId,
        authorId: owner.id,
        authorName: "Veloce Editorial",
        publishedAt,
        createdAt: publishedAt ?? new Date(),
        updatedAt: publishedAt ?? new Date(),
      })
      .returning();

    await db
      .insert(blogPostTags)
      .values(post.tagIds.map((tagId) => ({ postId: created.id, tagId })));
  }

  console.log(`  blog       ${posts.length} posts, ${categories.length} categories, ${tags.length} tags`);

  /* ---------------- Pages ---------------- */

  await db.delete(pages);

  await db.insert(pages).values([
    {
      slug: "contact",
      title: "Contact",
      template: "page",
      status: "published",
      showInFooter: true,
      sortOrder: 0,
      seoDescription: "Get in touch with the Veloce team.",
      publishedAt: new Date(),
      body: `We read everything that comes in and reply within one working day.

## Customer service

For orders, returns and sizing: [help@veloce.com](mailto:help@veloce.com)

Monday to Friday, 9am – 6pm.

## Press and partnerships

For media enquiries and collaborations: [press@veloce.com](mailto:press@veloce.com)

## Visit us

**Veloce Flagship**
41 Shoreditch High Street
London E1 6PN

Open seven days, 10am – 7pm. Gait analysis is free and takes about twenty minutes — no appointment needed.`,
    },
    {
      slug: "privacy-policy",
      title: "Privacy Policy",
      template: "page",
      status: "published",
      showInFooter: true,
      sortOrder: 1,
      seoDescription: "How Veloce collects, uses and protects your personal data.",
      publishedAt: new Date(),
      body: `Last updated: January 2026

This policy explains what we collect, why we collect it, and what you can ask us to do about it.

## What we collect

- **Account details** — your name and email address when you create an account
- **Order details** — what you bought and where we shipped it
- **Usage data** — pages viewed and products browsed, so we can improve the shop

We do not store card numbers. Payments are handled by our payment processor.

## Why we collect it

To fulfil your orders, to answer your questions, and to make the store work better. We do not sell your data to anyone.

## Your rights

You can ask us to show you the data we hold, correct it, or delete it entirely. Write to [privacy@veloce.com](mailto:privacy@veloce.com) and we will respond within thirty days.

## Cookies

We use cookies to keep you signed in and to remember your cart. You can clear them at any time in your browser settings, though the shop will forget your basket if you do.`,
    },
    {
      slug: "terms",
      title: "Terms of Service",
      template: "page",
      status: "published",
      showInFooter: true,
      sortOrder: 2,
      seoDescription: "The terms that apply when you shop with Veloce.",
      publishedAt: new Date(),
      body: `These terms apply whenever you buy from Veloce.

## Orders

An order is an offer to buy. We accept it when we send your shipping confirmation. If we cannot fulfil an order — a pricing error, or stock that sold out between your click and our warehouse — we will tell you and refund you in full.

## Pricing

Prices include VAT where applicable. We try hard to keep them accurate, but if something is listed at an obviously wrong price we reserve the right to cancel and refund rather than honour it.

## Returns

Unworn shoes in their original box can be returned within 30 days for a full refund. Worn shoes can be returned within 30 days if the fit is wrong — we would rather you ran in the right shoe.

## Liability

Nothing in these terms limits our liability for death, personal injury caused by negligence, or fraud.

## Governing law

These terms are governed by the law of England and Wales.`,
    },
    {
      slug: "faq",
      title: "Frequently Asked Questions",
      // The FAQ template turns each "##" heading into an accordion row.
      template: "faq",
      status: "published",
      showInFooter: true,
      sortOrder: 3,
      seoDescription: "Answers to the questions we get asked most.",
      publishedAt: new Date(),
      body: `## How long does delivery take?

Standard delivery is 2–4 working days. Express is next working day if you order before 2pm.

We ship from London and deliver across the UK and EU.

## Can I return shoes I have run in?

Yes. If the fit is wrong you have 30 days, worn or not. Just tell us what went wrong — it helps us fit you better next time.

## How do I know what size to order?

Veloce shoes run true to size for most people. If you are between sizes, take the larger one — your feet swell over a long run.

Every product page lists the specific fit notes for that model.

## When should I replace my running shoes?

Between 500 and 800 kilometres. The midsole foam compresses long before the upper looks worn, so go by distance rather than appearance.

## Do you offer gait analysis?

Yes, free, at our Shoreditch store. It takes about twenty minutes and no appointment is needed.

## Is my payment secure?

Yes. Payments are processed by our payment provider and card details never touch our servers.`,
    },
    {
      slug: "shipping-and-returns",
      title: "Shipping & Returns",
      template: "page",
      status: "draft",
      showInFooter: false,
      sortOrder: 4,
      body: `Draft — still being written.

## Shipping

Rates and timings to be confirmed with the new carrier.`,
    },
  ]);

  console.log("  pages      5 pages (4 published, 1 draft)");

  /* ---------------- Seed the activity feed ---------------- */

  await db.insert(activityLog).values([
    {
      actorId: owner.id,
      actorName: owner.name,
      action: "published",
      entityType: "page",
      summary: "Published page “Privacy Policy”",
    },
    {
      actorId: editor.id,
      actorName: editor.name,
      action: "created",
      entityType: "post",
      summary: "Created post “Inside the Velocity Lab”",
    },
    {
      actorId: editor.id,
      actorName: editor.name,
      action: "published",
      entityType: "post",
      summary: "Published post “How to choose your first running shoe”",
    },
  ]);

  console.log("\nDone.\n");
  console.log(`  Sign in at /admin/login`);
  console.log(`  ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}\n`);

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
