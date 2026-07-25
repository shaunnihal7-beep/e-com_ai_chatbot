# VELOCE

A premium performance-footwear storefront: Next.js 15 App Router, React 19,
TypeScript, Tailwind CSS v4, shadcn/ui (Base UI), Framer Motion, PostgreSQL via
Drizzle, and a catalogue-grounded chatbot running on a local Ollama model.

Veloce is a fictional brand. This is a demonstration build.

---

## Requirements

| | |
|---|---|
| Node | 20+ (built on 24.16) |
| PostgreSQL | 17 running on `localhost:5432` |
| Ollama | optional — the chatbot degrades gracefully without it |

## Setup

```bash
npm install
cp .env.example .env.local     # then edit DATABASE_URL if yours differs

npm run db:push                # create the schema
npm run images                 # download + normalise product photography
npm run db:seed                # 32 products, 83 colourways, reviews, demo orders

npm run dev
```

`npm run setup` runs the three data steps in order.

For the chatbot:

```bash
ollama pull llama3.2:3b        # model id is set by OLLAMA_MODEL
```

### Demo account

`demo@veloce.com` / `demo1234` — comes with three orders in its history.
Storefront authentication is **mocked**: any email and password will sign you in.

### Admin CMS

Run `npm run db:seed-cms` (included in `npm run setup`) to create the admin
accounts, blog content and the standard pages, then sign in at **`/admin`**:

| | |
|---|---|
| Owner | `admin@veloce.com` / `veloce-admin-2026` |
| Editor | `editor@veloce.com` / `veloce-editor-2026` |

Unlike the storefront, **admin auth is real** — bcrypt-verified passwords, an
HMAC-signed session with an 8-hour expiry, and per-email+IP rate limiting.
Change the seed credentials via `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

---

## CMS

A production-shaped admin panel at `/admin`, deliberately **free of animation**
(scoped via `[data-admin]` in `globals.css`) and split into its own route group
so it never inherits the storefront's motion, header or smooth scrolling.

- **Dashboard** — sales summary, a daily revenue chart, orders overview, top
  products, inventory + low-stock alerts, customer stats and an activity feed.
- **Products** — create, edit, duplicate, archive, publish/unpublish and delete;
  colour/size **variants** with per-size stock and image management. Only
  `published` products reach the storefront, so unpublishing is a real takedown.
- **Inventory** — every low or out-of-stock size, restockable inline.
- **Orders** — full detail with an editable fulfilment status.
- **Customers** — accounts with lifetime spend and order history.
- **Reviews** — a moderation queue (approve / reject), star + photo support and
  a public store reply. Storefront submissions arrive as `pending`.
- **Blog** — posts with Markdown + live preview, categories and tags.
- **Pages** — About / Contact / Privacy / Terms / FAQ, served by a catch-all
  route; the FAQ template renders `## heading` blocks as accordions.

Every mutation is a server action behind `requireAdminAction()` and is written to
an append-only activity log. Body copy is Markdown, rendered by `lib/markdown.ts`,
which **escapes input before formatting** — an editor account cannot inject
script into the storefront.

New CMS tables (`admin_users`, `activity_log`, `blog_*`, `pages`) and the added
product/review columns live in `db/schema.ts`; apply them with `npm run db:push`.

---

## Architecture

```
app/
  page.tsx                      home: hero, categories, rails, tech, collection
  shop/[...category]/           one catch-all route serves the whole shop tree
  product/[slug]/               PDP: gallery, variants, reviews, related
  collections/, about/, search/, wishlist/, account/, cart/, checkout/, order/
  api/chat/route.ts             streams from Ollama, falls back to the catalogue
  actions/                      server actions (auth, cart, checkout, reviews)

components/
  layout/    header + mega-menu, footer, mobile nav, search overlay, preloader
  product/   card, grid, filters, gallery, detail, reviews
  cart/, checkout/, order/, wishlist/, chat/
  motion/    Reveal, Stagger, SplitWords, Magnetic, PageTransition

lib/
  taxonomy.ts    single source for the shop tree — nav, routes and seed
  queries/       all SQL lives here; nothing else touches the database
  chat/          intent routing, catalogue retrieval, deterministic fallback
  stores/        zustand cart + wishlist, persisted to localStorage

db/schema.ts     Drizzle schema. All money is integer cents.
scripts/         catalog.ts (seed data) + fetch-images.ts (photography)
```

### Design system

Tokens live in `app/globals.css`. Neutral palette (paper / ink / greys) plus a
single accent — signal orange `#FF4400` — reserved for CTAs and never used for
decoration. Type is Inter Tight for display and Inter for body, on a fluid
`clamp()` scale. Light and dark are both first-class.

Motion rules are enforced in `components/motion/reveal.tsx`: only `transform`
and `opacity` animate, hover effects sit behind
`@media (hover: hover) and (pointer: fine)`, and everything collapses under
`prefers-reduced-motion`.

### Chatbot

Each message is classified by a weighted intent scorer
(`lib/chat/retrieval.ts`), which retrieves the relevant catalogue rows or policy
text and injects them as a FACTS block. The model may answer from nothing else,
so prices, stock and order status are always real. If Ollama is unreachable,
`lib/chat/fallback.ts` answers from the same retrieved context — less fluent,
equally accurate.

---

## Known constraints

- **Product photography.** Sourced under open licences from **Wikimedia
  Commons** (real Nike footwear, but documentary — only ~6% is studio quality)
  and **Openverse** (StockSnap/Rawpixel/Flickr, which is where the
  clean-backdrop product shots come from, though not all of it is Nike).
  `scripts/fetch-images.ts` downloads every candidate, scores it on backdrop
  uniformity, ranks, and gives the best images to the most prominent products;
  weaker photos get a subject-aware crop instead of a padded plate. Everything
  is normalised to an identical 4:5 studio plate.

  This is the ceiling for keyless open-licence imagery. For genuinely uniform
  catalogue photography you would drop real assets into `public/products/`
  (no code change) or plug in a keyed stock API. Attribution is at `/credits`.
  Nike is a trademark of Nike, Inc. and has no connection to this project.
- **Auth is mocked** — see `lib/auth.ts`. The session cookie is genuinely
  HMAC-signed and HTTP-only; the password simply isn't checked.
- **No payment** is taken at checkout, but the order is really written to
  Postgres.
- **SWC native binary** is blocked by this machine's Application Control policy,
  so the build runs on the WASM fallback and Turbopack is disabled. Remove
  `--turbopack`'s absence in `package.json` if you run it elsewhere.

## Scripts

| Command | |
|---|---|
| `npm run dev` | dev server |
| `npm run build` / `start` | production |
| `npm run db:push` | push schema |
| `npm run db:seed` | reseed catalogue (destructive, idempotent) |
| `npm run db:studio` | Drizzle Studio |
| `npm run images` | rebuild product photography |
