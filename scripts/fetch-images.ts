/**
 * Builds the product photography set.
 *
 *   1. Searches Wikimedia Commons (paginated) for genuine Nike shoe photography.
 *   2. Downloads every candidate once into a scratch cache and scores it for
 *      how much it looks like a product shot.
 *   3. Ranks by that score and assigns the BEST images to products first, so
 *      the weakest source photos land on the least prominent SKUs.
 *   4. Renders each to an identical 4:5 plate with a subject-aware crop.
 *
 * Commons is a documentary archive, not a product catalogue — only a small
 * fraction of it is studio photography. Ranking is what makes the grid look
 * deliberate despite that. See app/credits/page.tsx for attribution.
 *
 * Run with: npm run images
 */

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import sharp from "sharp";
import { seedProducts, type ImageBucket } from "./catalog";

const OUT_DIR = path.join(process.cwd(), "public", "products");
const GEN_DIR = path.join(process.cwd(), "scripts", "generated");
// Originals are cached outside the project — they are large and this folder
// is OneDrive-synced.
const CACHE_DIR = path.join(os.tmpdir(), "veloce-image-cache");

const UA =
  "VeloceStoreBuild/1.0 (local development build; contact: shaunnihal7@gmail.com)";

const PLATE_W = 1100;
const PLATE_H = 1375;
const PLATE_BG = { r: 242, g: 241, b: 238, alpha: 1 };

/**
 * Openverse aggregates StockSnap, Rawpixel and Flickr. Commons is documentary
 * and only ~6% of it is studio photography; the stock providers behind
 * Openverse are where the clean-backdrop product shots actually come from.
 *
 * Nike-specific queries run first so brand-relevant results rank ahead of the
 * generic athletic-footwear stock that fills the tail.
 */
const OPENVERSE_QUERIES: Record<ImageBucket, string[]> = {
  running: ["nike running shoe", "running shoes", "running shoe white background", "athletic shoes"],
  training: ["nike training shoe", "gym shoes", "training shoes", "athletic shoes studio"],
  football: ["nike football boot", "football boots", "soccer cleats", "football boot studio"],
  basketball: ["nike basketball shoe", "basketball shoes", "high top sneakers", "basketball sneaker"],
  lifestyle: ["nike sneakers", "sneakers", "sneakers white background", "shoes studio"],
};

const BUCKET_QUERIES: Record<ImageBucket, string[]> = {
  running: [
    "Nike running shoe",
    "Nike Air Max",
    "Nike Pegasus",
    "Nike Vaporfly",
    "Nike Air Zoom",
    "Nike Free running",
  ],
  training: [
    "Nike training shoe",
    "Nike Metcon",
    "Nike Free",
    "Nike Air Trainer",
    "Nike gym shoe",
    "Nike cross trainer",
  ],
  football: [
    "Nike Mercurial",
    "Nike football boot",
    "Nike cleat",
    "Nike Tiempo",
    "Nike Phantom",
    "Nike Hypervenom",
  ],
  basketball: [
    "Nike basketball shoe",
    "Nike Air Jordan",
    "Nike LeBron",
    "Nike Kobe",
    "Nike Blazer",
    "Nike Air Force",
  ],
  lifestyle: [
    "Nike sneaker",
    "Nike Air Force 1",
    "Nike Dunk",
    "Nike shoe",
    "Nike Cortez",
    "Nike trainers",
  ],
};

/**
 * Commons is full of things that are not product shots. Packaging, shopfronts
 * and macro detail crops all rank badly on the visual score anyway, but
 * rejecting them by title saves the download.
 */
const REJECT =
  /logo|swoosh|store|shop|billboard|advert|poster|sign|factory|headquarters|stadium|map|diagram|chart|box|packaging|receipt|patent|museum|display case|window|counterfeit|fake|pile|garbage|waste|worn out|damaged|dirty|mud|sole detail|close ?-?up|macro|insole|lace|shoelace|sock/i;

/**
 * "Nike" is also the Greek goddess of victory, so a title match alone pulls in
 * amphorae, friezes and statuary from Commons. Reject the classical material
 * outright...
 */
const REJECT_ANTIQUITY =
  /amphora|vase|pottery|krater|statue|sculpture|relief|marble|bronze age|terracotta|coin|temple|goddess|mytholog|ancient|attic|hellenistic|classical|fresco|altar|frieze|samothrace|winged|BCE?\b|\b\d{1,4} ?BC\b|\bpainter\b|\bARV\b|\bABV\b|attributed to|red-?figure|black-?figure/i;

/**
 * ...and require positive evidence the subject is footwear.
 *
 * Keyword rejection alone cannot catch classical material: the vase that got
 * through was titled "Drouot Painter ARV 1223 4 woman and Nike at door", which
 * names no artefact at all. Requiring a footwear term is the only reliable
 * signal. The list is deliberately broad — a narrow version starved football
 * to 18 candidates for 43 slots, so every Nike silhouette and model line the
 * archive actually uses is included here.
 */
const FOOTWEAR_HINT = new RegExp(
  [
    // Generic
    "shoe|sneaker|trainer|boot|cleat|footwear|runner|running|kicks|plimsoll",
    // Nike technology / line names
    "air ?max|air ?force|air ?jordan|jordan|zoom|flyknit|shox|roshe|presto|huarache|vapormax|waffle|\\bsb\\b|\\btn\\b|\\bam\\d",
    // Running models
    "pegasus|vaporfly|alphafly|structure|vomero|invincible|infinity|free ?run|streakfly",
    // Court / lifestyle models
    "dunk|blazer|cortez|terminator|lebron|kobe|kyrie|foamposite|uptempo",
    // Football models
    "mercurial|tiempo|phantom|hypervenom|magista|ctr360|total ?90|superfly|vapor|legend|elastico|bomba|premier",
    // Training models
    "metcon|romaleos|savaleos",
    // Commons is multilingual, and an English-only list cut the football pool
    // from ~65 to 19 by discarding legitimate boot photos titled in German,
    // Spanish, Portuguese, Italian, Dutch and French.
    "schuh|fu(ss|ß)ball|botines|botas|bota\\b|chuteira|calcio|scarpin|scarpe|zapatilla|zapato|chaussure|voetbal|futbol|fútbol|buty|obuv",
  ].join("|"),
  "i",
);

type Candidate = {
  title: string;
  url: string;
  width: number;
  height: number;
  artist: string;
  license: string;
  descriptionUrl: string;
  /** Populated in the scoring pass. Higher is better. */
  score?: number;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let lastRequestAt = 0;
const MIN_GAP_MS = 300;

async function politeFetch(
  url: string,
  attempt = 0,
  maxAttempts = 5,
): Promise<Response> {
  const wait = Math.max(0, lastRequestAt + MIN_GAP_MS - Date.now());
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();

  const res = await fetch(url, { headers: { "User-Agent": UA } });

  if ((res.status === 429 || res.status >= 500) && attempt < maxAttempts) {
    const retryAfter = Number(res.headers.get("retry-after"));
    const backoff =
      Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : Math.min(30_000, 1500 * 2 ** attempt);
    console.log(`    (${res.status} — backing off ${Math.round(backoff / 1000)}s)`);
    await sleep(backoff);
    return politeFetch(url, attempt + 1, maxAttempts);
  }

  return res;
}

function stripHtml(input: string | undefined): string {
  if (!input) return "Unknown";
  return input.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 120);
}

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

async function searchCommons(query: string, offset: number): Promise<Candidate[]> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6",
    gsrlimit: "50",
    gsroffset: String(offset),
    prop: "imageinfo",
    iiprop: "url|size|extmetadata",
  });

  const res = await politeFetch(`https://commons.wikimedia.org/w/api.php?${params}`);
  if (!res.ok) {
    console.warn(`    query "${query}" @${offset} -> HTTP ${res.status}`);
    return [];
  }

  const json = (await res.json()) as {
    query?: { pages?: Record<string, Record<string, unknown>> };
  };
  const pages = Object.values(json.query?.pages ?? {});

  const out: Candidate[] = [];
  for (const page of pages) {
    const title = String(page.title ?? "");
    const info = (page.imageinfo as Record<string, unknown>[] | undefined)?.[0];
    if (!info) continue;

    const width = Number(info.width ?? 0);
    const height = Number(info.height ?? 0);
    // Always the ORIGINAL file: requesting a thumbnail width makes Wikimedia
    // render it on demand, and that endpoint rate-limits hard.
    const url = String(info.url ?? "");

    if (!/nike/i.test(title)) continue;
    if (REJECT.test(title)) continue;
    if (REJECT_ANTIQUITY.test(title)) continue;
    if (!FOOTWEAR_HINT.test(title)) continue;
    if (!/\.(jpe?g|png)$/i.test(title)) continue;
    if (width < 900 || height < 600) continue;
    if (width / height > 2.6 || height / width > 2.2) continue;

    const meta = (info.extmetadata ?? {}) as Record<string, { value?: string }>;
    out.push({
      title: title.replace(/^File:/, ""),
      url,
      width,
      height,
      artist: stripHtml(meta.Artist?.value),
      license: stripHtml(meta.LicenseShortName?.value) || "See source",
      descriptionUrl: String(info.descriptionurl ?? ""),
    });
  }
  return out;
}

/**
 * Openverse — keyless, but rate-limited, so it goes through politeFetch too.
 * Restricted to licences that permit commercial use and modification.
 */
async function searchOpenverse(query: string, page: number): Promise<Candidate[]> {
  const params = new URLSearchParams({
    q: query,
    page_size: "50",
    page: String(page),
    license_type: "commercial,modification",
    // Stock providers first — these are the actual product photographs.
    source: "stocksnap,rawpixel,flickr",
  });

  // Openverse's anonymous quota is small and exhausts quickly. Fail fast
  // rather than stall the whole build behind escalating backoffs — Commons
  // is the reliable source, Openverse is a quality bonus when available.
  const res = await politeFetch(`https://api.openverse.org/v1/images/?${params}`, 0, 1);
  if (!res.ok) return [];

  const json = (await res.json()) as {
    results?: {
      title?: string;
      url?: string;
      width?: number;
      height?: number;
      creator?: string;
      license?: string;
      license_version?: string;
      foreign_landing_url?: string;
      source?: string;
    }[];
  };

  const out: Candidate[] = [];
  for (const r of json.results ?? []) {
    const width = Number(r.width ?? 0);
    const height = Number(r.height ?? 0);
    const url = r.url ?? "";
    const title = r.title ?? "Untitled";

    if (!url) continue;
    if (REJECT.test(title)) continue;
    if (REJECT_ANTIQUITY.test(title)) continue;
    if (!FOOTWEAR_HINT.test(title)) continue;
    if (width < 800 || height < 550) continue;
    if (width / height > 2.6 || height / width > 2.2) continue;

    out.push({
      title,
      url,
      width,
      height,
      artist: r.creator || "Unknown",
      license: [r.license?.toUpperCase(), r.license_version].filter(Boolean).join(" "),
      descriptionUrl: r.foreign_landing_url ?? url,
    });
  }
  return out;
}

async function buildPools(): Promise<Map<ImageBucket, Candidate[]>> {
  const cachePath = path.join(GEN_DIR, "pools.json");

  try {
    const cached = JSON.parse(await fs.readFile(cachePath, "utf8")) as Record<
      string,
      Candidate[]
    >;
    const buckets = Object.keys(BUCKET_QUERIES) as ImageBucket[];
    if (buckets.every((b) => cached[b]?.length)) {
      console.log("Using cached candidate pools.");
      const map = new Map<ImageBucket, Candidate[]>();
      for (const b of buckets) {
        console.log(`  ${b.padEnd(12)} ${cached[b].length} candidates`);
        map.set(b, cached[b]);
      }
      return map;
    }
  } catch {
    /* no cache */
  }

  console.log("Searching Wikimedia Commons and Openverse...");
  const map = new Map<ImageBucket, Candidate[]>();
  const store: Record<string, Candidate[]> = {};

  for (const bucket of Object.keys(BUCKET_QUERIES) as ImageBucket[]) {
    const seen = new Set<string>();
    const pool: Candidate[] = [];

    const add = (results: Candidate[]) => {
      for (const c of results) {
        const key = c.url;
        if (seen.has(key)) continue;
        seen.add(key);
        pool.push(c);
      }
    };

    // Openverse first — it carries the stock photography.
    for (const query of OPENVERSE_QUERIES[bucket]) {
      for (const page of [1, 2]) {
        add(await searchOpenverse(query, page).catch(() => []));
      }
    }

    for (const query of BUCKET_QUERIES[bucket]) {
      // Two pages per query — Commons caps gsrlimit at 50.
      for (const offset of [0, 50]) {
        add(await searchCommons(query, offset).catch(() => []));
      }
    }

    console.log(`  ${bucket.padEnd(12)} ${pool.length} candidates`);
    map.set(bucket, pool);
    store[bucket] = pool;
  }

  await fs.mkdir(GEN_DIR, { recursive: true });
  await fs.writeFile(cachePath, JSON.stringify(store, null, 2));
  return map;
}

/* ------------------------------------------------------------------ */
/* Download cache + scoring                                            */
/* ------------------------------------------------------------------ */

function cacheKey(url: string): string {
  return crypto.createHash("sha1").update(url).digest("hex") + ".bin";
}

async function fetchCached(url: string): Promise<Buffer | null> {
  const file = path.join(CACHE_DIR, cacheKey(url));
  try {
    const buf = await fs.readFile(file);
    if (buf.length > 1024) return buf;
  } catch {
    /* miss */
  }

  try {
    const res = await politeFetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(file, buf);
    return buf;
  } catch {
    return null;
  }
}

/**
 * How much does this look like a product shot?
 *
 * A studio photo has a uniform backdrop, so the border ring of the frame has
 * low colour variance. Snapshots (a shoe on grass, a box on carpet) have busy
 * rings. Resolution breaks ties.
 */
async function scoreImage(buffer: Buffer): Promise<number> {
  const W = 80;
  const H = 80;

  let raw: { data: Buffer };
  try {
    raw = await sharp(buffer)
      .resize(W, H, { fit: "fill" })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
  } catch {
    return -1;
  }

  const band = 10;
  const ring: number[] = [];
  const centre: number[] = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const value = raw.data[y * W + x];
      const isEdge = x < band || x >= W - band || y < band || y >= H - band;
      if (isEdge) ring.push(value);
      else centre.push(value);
    }
  }

  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const std = (a: number[], m: number) =>
    Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length);

  const ringMean = mean(ring);
  const ringStd = std(ring, ringMean);
  const centreMean = mean(centre);

  // Uniform backdrop is the dominant signal.
  let score = Math.max(0, 100 - ringStd * 2.2);

  // A light sweep is the retail convention; a clean dark backdrop also works.
  if (ringMean > 175) score += 45;
  else if (ringMean > 150) score += 22;
  else if (ringMean < 55) score += 18;

  // The subject should stand apart from the backdrop.
  score += Math.min(25, Math.abs(centreMean - ringMean) * 0.5);

  return score;
}

/* ------------------------------------------------------------------ */
/* Plate rendering                                                     */
/* ------------------------------------------------------------------ */

/**
 * Average colour of the source's border ring.
 *
 * Padding a contained image with a fixed off-white leaves visible bands
 * wherever the photo's own backdrop is a different grey — it reads as
 * letterboxing rather than a studio sweep. Matching the pad to the source
 * makes the join invisible.
 */
async function borderColour(
  buffer: Buffer,
): Promise<{ r: number; g: number; b: number; alpha: number }> {
  try {
    const W = 60;
    const H = 60;
    const { data } = await sharp(buffer)
      .resize(W, H, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const band = 6;
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!(x < band || x >= W - band || y < band || y >= H - band)) continue;
        const i = (y * W + x) * 3;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        n++;
      }
    }

    return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n), alpha: 1 };
  } catch {
    return PLATE_BG;
  }
}

async function makePlate(buffer: Buffer, outPath: string, studio: boolean) {
  const pipeline = sharp(buffer).rotate();

  if (studio) {
    // Clean backdrop: keep the whole subject and float it in the plate margin,
    // padded with the photo's own backdrop colour so there is no visible seam.
    const background = await borderColour(buffer);

    const inner = await pipeline
      .resize(Math.round(PLATE_W * 0.88), Math.round(PLATE_H * 0.88), {
        fit: "inside",
        withoutEnlargement: false,
      })
      .toBuffer();

    await sharp(inner)
      .resize(PLATE_W, PLATE_H, { fit: "contain", background })
      .modulate({ saturation: 1.04 })
      .sharpen({ sigma: 0.6 })
      .jpeg({ quality: 82, mozjpeg: true, progressive: true })
      .toFile(outPath);
    return;
  }

  // Busy backdrop: crop to the most salient region so the shoe fills the frame
  // instead of padding a whole scene into the plate.
  await pipeline
    .resize(PLATE_W, PLATE_H, {
      fit: "cover",
      position: sharp.strategy.attention,
    })
    .modulate({ saturation: 1.02 })
    .sharpen({ sigma: 0.6 })
    .jpeg({ quality: 82, mozjpeg: true, progressive: true })
    .toFile(outPath);
}

/* ------------------------------------------------------------------ */

type ManifestEntry = { images: { url: string; alt: string }[] };

/** Best images go to the most prominent products. */
function productPriority(slug: string): number {
  const p = seedProducts.find((s) => s.slug === slug)!;
  return (p.isBestSeller ? 0 : p.isNew ? 1 : 2);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(GEN_DIR, { recursive: true });
  await fs.mkdir(CACHE_DIR, { recursive: true });

  const pools = await buildPools();

  // No product declares the "lifestyle" bucket — it exists purely to widen the
  // choice for the sneaker-shaped categories. Fold it in so the scorer has
  // more to pick from, and drop it as a bucket of its own.
  const lifestyle = pools.get("lifestyle") ?? [];
  if (lifestyle.length) {
    for (const bucket of ["running", "training", "basketball"] as ImageBucket[]) {
      const pool = pools.get(bucket)!;
      const seen = new Set(pool.map((c) => c.url));
      pool.push(...lifestyle.filter((c) => !seen.has(c.url)));
      console.log(`  ${bucket.padEnd(12)} widened to ${pool.length} candidates`);
    }
    pools.delete("lifestyle");
  }

  // ---- Score every candidate once -------------------------------------
  console.log("\nDownloading and scoring candidates...");
  let scanned = 0;

  for (const [bucket, candidates] of pools) {
    for (const candidate of candidates) {
      const buf = await fetchCached(candidate.url);
      if (!buf) {
        candidate.score = -1;
      } else {
        candidate.score = await scoreImage(buf);
      }
      scanned++;
      if (scanned % 40 === 0) console.log(`  ...${scanned} scanned`);
    }
    // Best first.
    candidates.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    const usable = candidates.filter((c) => (c.score ?? -1) >= 0);
    const strong = usable.filter((c) => (c.score ?? 0) > 100);
    console.log(
      `  ${bucket.padEnd(12)} ${usable.length} usable, ${strong.length} clean-backdrop`,
    );
  }

  // ---- Assign, best-first ---------------------------------------------
  console.log("\nRendering plates...");

  const ordered = [...seedProducts].sort(
    (a, b) => productPriority(a.slug) - productPriority(b.slug),
  );

  const manifest: Record<string, ManifestEntry> = {};
  const credits: Record<string, Candidate> = {};
  const cursor = new Map<ImageBucket, number>();
  let written = 0;
  let failed = 0;

  for (const product of ordered) {
    const dir = path.join(OUT_DIR, product.slug);
    await fs.mkdir(dir, { recursive: true });

    for (const color of product.colors) {
      const entry: ManifestEntry = { images: [] };

      for (let i = 0; i < 2; i++) {
        const fileName = `${color.slug}-${i + 1}.jpg`;
        const outPath = path.join(dir, fileName);
        const publicUrl = `/products/${product.slug}/${fileName}`;

        const pool = pools.get(product.imageBucket)!.filter((c) => (c.score ?? -1) >= 0);
        if (pool.length === 0) {
          failed++;
          continue;
        }

        const index = cursor.get(product.imageBucket) ?? 0;
        cursor.set(product.imageBucket, index + 1);
        // Wrap rather than run dry — a repeated photo beats a missing one.
        const candidate = pool[index % pool.length];

        const buf = await fetchCached(candidate.url);
        if (!buf) {
          failed++;
          continue;
        }

        try {
          await makePlate(buf, outPath, (candidate.score ?? 0) > 100);
          entry.images.push({
            url: publicUrl,
            alt: `${product.name} in ${color.name}, view ${i + 1}`,
          });
          credits[publicUrl] = candidate;
          written++;
          if (written % 30 === 0) console.log(`  ...${written} plates written`);
        } catch (err) {
          console.warn(`  ! ${publicUrl}: ${(err as Error).message}`);
          failed++;
        }
      }

      manifest[`${product.slug}/${color.slug}`] = entry;
    }
  }

  await fs.writeFile(path.join(GEN_DIR, "images.json"), JSON.stringify(manifest, null, 2));
  await fs.writeFile(path.join(GEN_DIR, "credits.json"), JSON.stringify(credits, null, 2));

  console.log(`\nDone. ${written} plates written, ${failed} failed.`);

  const empty = Object.entries(manifest).filter(([, v]) => v.images.length === 0);
  if (empty.length) {
    console.warn(`\nWARNING: ${empty.length} colourways have no images.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
