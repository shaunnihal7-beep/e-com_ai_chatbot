/**
 * The seed catalog: 32 products across the six leaf categories.
 *
 * This file is the input to BOTH `scripts/fetch-images.ts` (which assigns and
 * downloads photography per colourway) and `db/seed.ts` (which writes rows).
 * Keeping them on one source means images and rows can never drift apart.
 */

export type SeedColor = {
  name: string;
  slug: string;
  hex: string;
};

export type SeedProduct = {
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  story: string;
  priceCents: number;
  salePriceCents?: number;
  categoryPath: string;
  isNew?: boolean;
  isBestSeller?: boolean;
  technologies: string[];
  weightGrams: number;
  dropMm: number;
  colors: SeedColor[];
  /** Which image bucket in fetch-images.ts this product draws from. */
  imageBucket: ImageBucket;
};

export type ImageBucket =
  | "running"
  | "training"
  | "football"
  | "basketball"
  | "lifestyle";

/* ------------------------------------------------------------------ */
/* Colour palette shared across the range                              */
/* ------------------------------------------------------------------ */

const C = {
  black: { name: "Core Black", slug: "core-black", hex: "#111111" },
  white: { name: "Summit White", slug: "summit-white", hex: "#F5F5F3" },
  bone: { name: "Bone", slug: "bone", hex: "#D8CFC0" },
  volt: { name: "Volt", slug: "volt", hex: "#D8FF3E" },
  flare: { name: "Solar Flare", slug: "solar-flare", hex: "#FF4400" },
  cobalt: { name: "Cobalt", slug: "cobalt", hex: "#1B3FCC" },
  crimson: { name: "Crimson", slug: "crimson", hex: "#C0192B" },
  sage: { name: "Dry Sage", slug: "dry-sage", hex: "#8A9177" },
  slate: { name: "Storm Slate", slug: "storm-slate", hex: "#5A6068" },
  sand: { name: "Desert Sand", slug: "desert-sand", hex: "#C9A87C" },
  ink: { name: "Ink Navy", slug: "ink-navy", hex: "#1B2440" },
  copper: { name: "Copper", slug: "copper", hex: "#B06A3B" },
  violet: { name: "Ultraviolet", slug: "ultraviolet", hex: "#6B4BD6" },
  teal: { name: "Deep Teal", slug: "deep-teal", hex: "#125C5C" },
  grey: { name: "Concrete", slug: "concrete", hex: "#9A9A98" },
} as const;

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */

export const seedProducts: SeedProduct[] = [
  /* ---------------- Running (8) ---------------- */
  {
    slug: "aero-fk",
    name: "Aero FK",
    subtitle: "Men's & Women's Road Running Shoe",
    description:
      "The Aero FK is the shoe we hand to someone who has never trusted a running shoe before. A single-piece knit upper holds the midfoot without a seam anywhere near the flex point, and the compression-moulded foam is soft enough for an easy hour but never folds under a hard finish.",
    story:
      "We spent two years chasing a single number: the millisecond gap between footstrike and toe-off. The AeroCell midsole closes it by returning energy along the same line it absorbed it, so nothing is wasted sideways.",
    priceCents: 18000,
    categoryPath: "sports/running",
    isNew: true,
    isBestSeller: true,
    technologies: ["AeroCell Foam", "FlyKnit Upper", "Carbon Heel Clip"],
    weightGrams: 232,
    dropMm: 8,
    colors: [C.black, C.white, C.volt],
    imageBucket: "running",
  },
  {
    slug: "pace-4",
    name: "Pace 4",
    subtitle: "Men's & Women's Daily Trainer",
    description:
      "Four generations in, the Pace has stopped trying to be exciting and started being reliable. This is the shoe for the sixty percent of your week that is neither a race nor a recovery jog — the honest miles in between.",
    story:
      "Every Pace is tested to 800 kilometres before it leaves the lab. The outsole rubber is mapped to real wear data, thickest exactly where our testers wore through the last generation.",
    priceCents: 14000,
    categoryPath: "sports/running",
    isBestSeller: true,
    technologies: ["AeroCell Foam", "Engineered Mesh", "WearMap Outsole"],
    weightGrams: 258,
    dropMm: 10,
    colors: [C.slate, C.white, C.cobalt],
    imageBucket: "running",
  },
  {
    slug: "meridian",
    name: "Meridian",
    subtitle: "Unisex Carbon Plate Racer",
    description:
      "A full-length carbon plate suspended between two layers of nitrogen-infused foam. The Meridian is not a comfortable shoe to stand around in — it is built to do one thing, at one pace, for one distance, better than anything else in the range.",
    story:
      "The plate geometry came from a rejected prototype. Our lead engineer kept the failed mould on her desk for a year before realising the curvature was right and the stiffness was wrong.",
    priceCents: 21000,
    categoryPath: "sports/running",
    isNew: true,
    technologies: ["Carbon Meridian Plate", "N2 Foam", "Race Vamp"],
    weightGrams: 186,
    dropMm: 8,
    colors: [C.flare, C.black],
    imageBucket: "running",
  },
  {
    slug: "drift-trail",
    name: "Drift Trail",
    subtitle: "Men's & Women's Trail Running Shoe",
    description:
      "Five-millimetre lugs, a rock plate you will forget is there, and a toe bumper that has survived everything our testers pointed it at. Built for loose ground, wet roots and the descent you regret starting.",
    story:
      "Prototyped over three seasons in the Cairngorms. The lug spacing is wide enough to shed clay, which is why it looks unusually aggressive for a shoe this light.",
    priceCents: 15500,
    categoryPath: "sports/running",
    technologies: ["GripLug Outsole", "Rock Plate", "Drainage Mesh"],
    weightGrams: 289,
    dropMm: 6,
    colors: [C.sage, C.black, C.copper],
    imageBucket: "running",
  },
  {
    slug: "loop-recovery",
    name: "Loop Recovery",
    subtitle: "Unisex Recovery Run Shoe",
    description:
      "Maximum stack, minimum opinion. The Loop exists for the day after the long run, when the job of the shoe is to stay out of the way and let your legs do nothing at all.",
    story:
      "The softest foam we make, in the thickest slab we can stabilise. Anything more and the shoe starts steering you — which is the opposite of recovery.",
    priceCents: 12000,
    categoryPath: "sports/running",
    technologies: ["AeroCell Max", "Wide Base Geometry", "Plush Collar"],
    weightGrams: 301,
    dropMm: 6,
    colors: [C.bone, C.slate],
    imageBucket: "running",
  },
  {
    slug: "tempo-elite",
    name: "Tempo Elite",
    subtitle: "Unisex Marathon Racing Shoe",
    description:
      "Our flagship. Everything the Meridian does, taken two grams further and one degree sharper. Worn under three national records last season and rebuilt from the plate up for this one.",
    story:
      "Limited to what our Portuguese facility can produce by hand. The tolerance on plate placement is half a millimetre, which no automated line has yet matched.",
    priceCents: 25000,
    salePriceCents: 19900,
    categoryPath: "sports/running",
    isBestSeller: true,
    technologies: ["Carbon Meridian Plate", "N2 Foam", "Hand-Lasted Upper"],
    weightGrams: 172,
    dropMm: 8,
    colors: [C.volt, C.black, C.white],
    imageBucket: "running",
  },
  {
    slug: "kinetic-2",
    name: "Kinetic 2",
    subtitle: "Men's & Women's Speed Trainer",
    description:
      "The workout shoe. Firm enough to hold a shape through intervals, cushioned enough that you can warm up and cool down in the same pair without switching.",
    story:
      "We removed 22 grams from the first Kinetic without touching the midsole — all of it came out of the upper and the lacing hardware.",
    priceCents: 13000,
    categoryPath: "sports/running",
    technologies: ["AeroCell Firm", "Speed Mesh", "Split Outsole"],
    weightGrams: 214,
    dropMm: 7,
    colors: [C.cobalt, C.white, C.flare],
    imageBucket: "running",
  },
  {
    slug: "halo-long-run",
    name: "Halo Long Run",
    subtitle: "Unisex Long Distance Trainer",
    description:
      "Built for hour three. A taller stack than the Pace with a rocker profile that keeps you rolling forward when your form starts to go, plus a heel counter that stays honest as your feet swell.",
    story:
      "The rocker angle was set by filming tired runners, not fresh ones. Fresh runners do not need help.",
    priceCents: 16500,
    categoryPath: "sports/running",
    isNew: true,
    technologies: ["AeroCell Max", "Rocker Geometry", "Adaptive Heel Counter"],
    weightGrams: 271,
    dropMm: 9,
    colors: [C.ink, C.bone, C.teal],
    imageBucket: "running",
  },

  /* ---------------- Training (6) ---------------- */
  {
    slug: "anchor-lift",
    name: "Anchor Lift",
    subtitle: "Unisex Weightlifting Shoe",
    description:
      "A flat, dense, incompressible platform with a raised heel and a midfoot strap that does not move. If you can feel your shoe compress under a heavy squat, it is doing the opposite of its job.",
    story:
      "The heel is TPU, not foam. It has been drop-tested to 400 kilogrammes with under a millimetre of deflection.",
    priceCents: 14500,
    categoryPath: "sports/training",
    isBestSeller: true,
    technologies: ["TPU Heel Wedge", "Midfoot Strap", "Flat Contact Outsole"],
    weightGrams: 412,
    dropMm: 20,
    colors: [C.black, C.crimson],
    imageBucket: "training",
  },
  {
    slug: "forge-hiit",
    name: "Forge HIIT",
    subtitle: "Men's & Women's Training Shoe",
    description:
      "Wide forefoot, low drop, and enough lateral wall to survive a session of skaters and lateral bounds. The rope guard on the medial side has outlived three generations of our testers' skipping ropes.",
    story:
      "Named for the abuse it takes rather than anything poetic. The first sample came back from a CrossFit box in Leeds with the toe worn through — that panel is now double-layered.",
    priceCents: 12500,
    categoryPath: "sports/training",
    technologies: ["Rope Guard", "Lateral Cage", "Wide Toe Box"],
    weightGrams: 298,
    dropMm: 4,
    colors: [C.grey, C.volt, C.black],
    imageBucket: "training",
  },
  {
    slug: "pivot-court",
    name: "Pivot Court",
    subtitle: "Unisex Court & Agility Trainer",
    description:
      "For sports that change direction faster than they travel. A pivot point under the ball of the foot lets you rotate without the outsole fighting you, and the herringbone tread holds on a dusty indoor floor.",
    story:
      "Developed alongside a badminton squad who kept shredding running shoes sideways within a fortnight.",
    priceCents: 13500,
    categoryPath: "sports/training",
    technologies: ["Pivot Point Outsole", "Herringbone Tread", "Torsion Shank"],
    weightGrams: 276,
    dropMm: 6,
    colors: [C.white, C.ink],
    imageBucket: "training",
  },
  {
    slug: "base-trainer",
    name: "Base Trainer",
    subtitle: "Men's & Women's Everyday Gym Shoe",
    description:
      "The one that does everything adequately and nothing badly. If you are in the gym three times a week and do not want to think about footwear, this is the correct answer.",
    story:
      "Our highest-volume shoe and the one we change least. Version four differs from version one by a single outsole compound.",
    priceCents: 11000,
    categoryPath: "sports/training",
    technologies: ["AeroCell Firm", "Durable Mesh", "Flat Outsole"],
    weightGrams: 285,
    dropMm: 6,
    colors: [C.black, C.white, C.slate],
    imageBucket: "training",
  },
  {
    slug: "circuit-pro",
    name: "Circuit Pro",
    subtitle: "Unisex Performance Training Shoe",
    description:
      "The Forge with the volume turned up. Stiffer through the midfoot for heavier loads, but keeps enough forefoot flex that you can still run the 400 metres at the end of the session.",
    story:
      "Two densities of foam separated by a nylon shank — soft at the forefoot, unyielding at the heel, in one piece.",
    priceCents: 15000,
    categoryPath: "sports/training",
    isNew: true,
    technologies: ["Dual-Density Midsole", "Nylon Shank", "Rope Guard"],
    weightGrams: 305,
    dropMm: 5,
    colors: [C.flare, C.black, C.bone],
    imageBucket: "training",
  },
  {
    slug: "grid-cross",
    name: "Grid Cross",
    subtitle: "Men's & Women's Cross Training Shoe",
    description:
      "A grid-reinforced upper that resists stretch in every direction, over a base wide enough to stand and lift on. Built for the session that has no name and includes everything.",
    story:
      "The grid is a single filament laid in one continuous path — no stitching, no bonded overlays, nothing to peel.",
    priceCents: 12800,
    salePriceCents: 9900,
    categoryPath: "sports/training",
    technologies: ["Filament Grid Upper", "Wide Base Geometry", "Lateral Cage"],
    weightGrams: 291,
    dropMm: 5,
    colors: [C.sage, C.grey],
    imageBucket: "training",
  },

  /* ---------------- Football — Firm Ground (5) ---------------- */
  {
    slug: "vantage-fg",
    name: "Vantage FG",
    subtitle: "Firm Ground Football Boot",
    description:
      "Our lightest firm-ground boot. A textured strike zone across the instep grips the ball through the first centimetre of contact, which is where a pass is actually decided.",
    story:
      "The soleplate is a single carbon-infused chassis with conical studs at the heel and blades at the forefoot — acceleration where you push, release where you turn.",
    priceCents: 23000,
    categoryPath: "sports/football/fg",
    isNew: true,
    isBestSeller: true,
    technologies: ["Carbon Chassis", "GripSkin Strike Zone", "Hybrid Stud Layout"],
    weightGrams: 196,
    dropMm: 8,
    colors: [C.volt, C.black, C.flare],
    imageBucket: "football",
  },
  {
    slug: "strike-fg",
    name: "Strike FG",
    subtitle: "Firm Ground Football Boot",
    description:
      "Built for the player who shoots. A raised fin pattern across the laces adds swerve on a clean strike, and the asymmetric lacing clears the instep entirely.",
    story:
      "We tested fin height in a wind tunnel, then threw the data out and tested it again with actual players. The final height is lower than the tunnel wanted.",
    priceCents: 17500,
    categoryPath: "sports/football/fg",
    technologies: ["Swerve Fins", "Asymmetric Lacing", "Hybrid Stud Layout"],
    weightGrams: 214,
    dropMm: 8,
    colors: [C.crimson, C.white],
    imageBucket: "football",
  },
  {
    slug: "apex-blade-fg",
    name: "Apex Blade FG",
    subtitle: "Firm Ground Football Boot",
    description:
      "The top of the range. A knit collar that genuinely holds the ankle, a soleplate tuned per size rather than scaled from one mould, and the thinnest upper we can make that still survives a season.",
    story:
      "Soleplate stiffness is tuned per size. A size 7 and a size 12 apply very different forces, and scaling one mould serves neither well.",
    priceCents: 26000,
    categoryPath: "sports/football/fg",
    isBestSeller: true,
    technologies: ["Size-Tuned Soleplate", "Knit Collar", "GripSkin Strike Zone"],
    weightGrams: 189,
    dropMm: 8,
    colors: [C.black, C.violet, C.volt],
    imageBucket: "football",
  },
  {
    slug: "tenet-fg",
    name: "Tenet FG",
    subtitle: "Firm Ground Football Boot",
    description:
      "The entry point, and the boot we quietly recommend most often. A synthetic upper that needs no breaking in and a soleplate carried over unchanged from a boot twice the price.",
    story:
      "The only meaningful difference from the Vantage is the upper material. The part that touches the pitch is identical.",
    priceCents: 14000,
    categoryPath: "sports/football/fg",
    technologies: ["Hybrid Stud Layout", "No-Break-In Synthetic", "Padded Collar"],
    weightGrams: 231,
    dropMm: 8,
    colors: [C.white, C.black, C.cobalt],
    imageBucket: "football",
  },
  {
    slug: "origin-fg",
    name: "Origin FG",
    subtitle: "Firm Ground Football Boot — Leather",
    description:
      "Kangaroo-free full-grain leather that moulds to the foot over the first three matches and then stops moving. For players who think modern boots feel like plastic, because mostly they are.",
    story:
      "Leather from a single tannery in Tuscany, vegetable-tanned over six weeks. It is slower and more expensive and there is no substitute for it.",
    priceCents: 19500,
    categoryPath: "sports/football/fg",
    technologies: ["Full-Grain Leather", "Fold-Over Tongue", "Conical Studs"],
    weightGrams: 243,
    dropMm: 8,
    colors: [C.black, C.copper],
    imageBucket: "football",
  },

  /* ---------------- Football — Soft Ground (4) ---------------- */
  {
    slug: "vantage-sg",
    name: "Vantage SG",
    subtitle: "Soft Ground Football Boot",
    description:
      "The Vantage chassis with six replaceable aluminium studs. For pitches that have stopped being grass and become mud with ambitions.",
    story:
      "Studs ship in 13mm and 15mm. The key is that the mounting thread is steel-reinforced, so you can change them all season without stripping the plate.",
    priceCents: 24500,
    categoryPath: "sports/football/sg",
    isNew: true,
    technologies: ["Aluminium Studs", "Steel-Reinforced Threads", "Carbon Chassis"],
    weightGrams: 219,
    dropMm: 9,
    colors: [C.black, C.volt],
    imageBucket: "football",
  },
  {
    slug: "mire-sg",
    name: "Mire SG",
    subtitle: "Soft Ground Football Boot",
    description:
      "Named honestly. A soleplate that sheds clay instead of collecting it, with wide channels between studs so you are not carrying half the pitch by the second half.",
    story:
      "We modelled the mud release channels on agricultural tyre tread, which has been solving this exact problem for a century.",
    priceCents: 18500,
    categoryPath: "sports/football/sg",
    isBestSeller: true,
    technologies: ["Mud Release Channels", "Aluminium Studs", "Water-Shed Upper"],
    weightGrams: 236,
    dropMm: 9,
    colors: [C.ink, C.flare, C.white],
    imageBucket: "football",
  },
  {
    slug: "anchor-sg",
    name: "Anchor SG",
    subtitle: "Soft Ground Football Boot — Defender",
    description:
      "Heavier, and unapologetic about it. Extra heel structure and a reinforced toe for players whose job involves contact rather than avoiding it.",
    story:
      "Built after a season of warranty data showed centre-backs destroying boots in a completely different place from wingers.",
    priceCents: 20500,
    categoryPath: "sports/football/sg",
    technologies: ["Reinforced Toe Box", "Structured Heel", "Aluminium Studs"],
    weightGrams: 258,
    dropMm: 9,
    colors: [C.black, C.crimson],
    imageBucket: "football",
  },
  {
    slug: "deluge-sg",
    name: "Deluge SG",
    subtitle: "Soft Ground Football Boot",
    description:
      "A treated upper that stops absorbing water at the point most boots start. Weighs almost the same at full time as it did at kick-off, which is not true of leather.",
    story:
      "Tested by weighing boots before and after ninety minutes in the rain. The Deluge gained 11 grams; the leather boot we tested against gained 74.",
    priceCents: 16000,
    salePriceCents: 12800,
    categoryPath: "sports/football/sg",
    technologies: ["Hydrophobic Coating", "Aluminium Studs", "Drainage Ports"],
    weightGrams: 241,
    dropMm: 9,
    colors: [C.teal, C.white],
    imageBucket: "football",
  },

  /* ---------------- Basketball — High Top (5) ---------------- */
  {
    slug: "tower-ht",
    name: "Tower HT",
    subtitle: "High Top Basketball Shoe",
    description:
      "Full collar, wide base, and a heel counter that does not negotiate. Built for players who land from height and need the ankle exactly where they left it.",
    story:
      "The collar height was set by measuring where our tallest testers' ankles actually bent, not by copying the category.",
    priceCents: 17000,
    categoryPath: "basketball/high-top",
    isBestSeller: true,
    technologies: ["Full Collar Lockdown", "AeroCell Heel Unit", "Torsion Shank"],
    weightGrams: 398,
    dropMm: 10,
    colors: [C.white, C.black, C.crimson],
    imageBucket: "basketball",
  },
  {
    slug: "rampart-ht",
    name: "Rampart HT",
    subtitle: "High Top Basketball Shoe",
    description:
      "Containment first. A external heel cage and a lateral wall that climbs higher than it looks, for the moment your foot tries to leave the shoe on a hard cut.",
    story:
      "Every prototype was tested by asking players to make the same cut two hundred times. The failures always happened laterally, never forward.",
    priceCents: 19000,
    categoryPath: "basketball/high-top",
    isNew: true,
    technologies: ["External Heel Cage", "Lateral Containment Wall", "N2 Forefoot"],
    weightGrams: 405,
    dropMm: 10,
    colors: [C.black, C.violet],
    imageBucket: "basketball",
  },
  {
    slug: "vertex-ht",
    name: "Vertex HT",
    subtitle: "High Top Basketball Shoe — Signature",
    description:
      "Our signature high top. Full-length nitrogen foam under a woven upper, with a traction pattern derived from three seasons of court-mapping data rather than a designer's sketch.",
    story:
      "The outsole pattern is a heat map of where players actually pivot, turned into geometry. It looks arbitrary and is the opposite.",
    priceCents: 21500,
    categoryPath: "basketball/high-top",
    isBestSeller: true,
    technologies: ["Full-Length N2 Foam", "Court-Mapped Traction", "Woven Upper"],
    weightGrams: 386,
    dropMm: 9,
    colors: [C.flare, C.black, C.white],
    imageBucket: "basketball",
  },
  {
    slug: "bastion-ht",
    name: "Bastion HT",
    subtitle: "High Top Basketball Shoe",
    description:
      "The team shoe. Everything essential, nothing decorative, at a price a club can buy twelve pairs of. Same outsole compound as the Vertex.",
    story:
      "Designed to a price from the first sketch rather than cost-reduced afterwards, which is why nothing important is missing.",
    priceCents: 15000,
    categoryPath: "basketball/high-top",
    technologies: ["Court-Mapped Traction", "AeroCell Heel Unit", "Padded Collar"],
    weightGrams: 421,
    dropMm: 10,
    colors: [C.black, C.white, C.cobalt],
    imageBucket: "basketball",
  },
  {
    slug: "eclipse-ht",
    name: "Eclipse HT",
    subtitle: "High Top Basketball Shoe — Limited",
    description:
      "A limited run on the Vertex chassis with a tonal woven upper and a translucent outsole. Four hundred pairs, numbered on the insole.",
    story:
      "Made because the factory had a run of yarn left over and we liked the colour too much to waste it.",
    priceCents: 23500,
    categoryPath: "basketball/high-top",
    isNew: true,
    technologies: ["Full-Length N2 Foam", "Translucent Outsole", "Numbered Insole"],
    weightGrams: 389,
    dropMm: 9,
    colors: [C.ink, C.bone],
    imageBucket: "basketball",
  },

  /* ---------------- Basketball — Mid Top (4) ---------------- */
  {
    slug: "glide-mt",
    name: "Glide MT",
    subtitle: "Mid Top Basketball Shoe",
    description:
      "Cut just below the ankle bone so nothing binds when you drive. For guards who have never once wanted more collar than this.",
    story:
      "The cut line is 12mm below the lateral malleolus on every size — measured, not scaled.",
    priceCents: 16000,
    categoryPath: "basketball/mid-top",
    isBestSeller: true,
    technologies: ["Anatomical Cut Line", "N2 Forefoot", "Court-Mapped Traction"],
    weightGrams: 352,
    dropMm: 9,
    colors: [C.white, C.volt, C.black],
    imageBucket: "basketball",
  },
  {
    slug: "cutback-mt",
    name: "Cutback MT",
    subtitle: "Mid Top Basketball Shoe",
    description:
      "The lightest shoe we make for the court. Almost nothing above the midsole, which is the point — everything you feel is traction and foam.",
    story:
      "We removed the tongue entirely and replaced it with an internal bootie. It saved 31 grams and improved lockdown, which almost never happens together.",
    priceCents: 14500,
    categoryPath: "basketball/mid-top",
    technologies: ["Internal Bootie", "Minimal Upper", "Court-Mapped Traction"],
    weightGrams: 328,
    dropMm: 9,
    colors: [C.black, C.flare],
    imageBucket: "basketball",
  },
  {
    slug: "feint-mt",
    name: "Feint MT",
    subtitle: "Mid Top Basketball Shoe",
    description:
      "Built around the first step. A stiffer forefoot plate than the Glide so the shoe pushes back when you load it, without the weight penalty of a high top.",
    story:
      "The plate only spans the forefoot. Extending it further back made the shoe faster in the lab and worse on the court.",
    priceCents: 18000,
    categoryPath: "basketball/mid-top",
    isNew: true,
    technologies: ["Forefoot Propulsion Plate", "N2 Forefoot", "Woven Upper"],
    weightGrams: 341,
    dropMm: 9,
    colors: [C.cobalt, C.white, C.grey],
    imageBucket: "basketball",
  },
  {
    slug: "current-mt",
    name: "Current MT",
    subtitle: "Mid Top Basketball Shoe — Signature",
    description:
      "The mid-top counterpart to the Vertex, with the same foam and traction in a lower cut. If you want the signature shoe but have never liked a collar, this is it.",
    story:
      "Requested by enough players that we stopped treating it as a variant and gave it its own last.",
    priceCents: 20000,
    salePriceCents: 16000,
    categoryPath: "basketball/mid-top",
    technologies: ["Full-Length N2 Foam", "Court-Mapped Traction", "Anatomical Cut Line"],
    weightGrams: 347,
    dropMm: 9,
    colors: [C.sand, C.black, C.teal],
    imageBucket: "basketball",
  },
];

/* ------------------------------------------------------------------ */
/* Size runs & deterministic stock                                     */
/* ------------------------------------------------------------------ */

function sizeRun(min: number, max: number): number[] {
  const sizes: number[] = [];
  for (let s = min; s <= max; s += 0.5) sizes.push(s);
  return sizes;
}

export function sizesForCategory(categoryPath: string): number[] {
  if (categoryPath.startsWith("basketball")) return sizeRun(7, 15);
  if (categoryPath.startsWith("sports/football")) return sizeRun(6, 12);
  return sizeRun(6, 13);
}

/** Stable hash so re-seeding produces an identical catalogue. */
function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Roughly one size in nine is out of stock, weighted towards the extremes of
 * the run — which is what a real catalogue looks like.
 */
export function stockFor(productSlug: string, colorSlug: string, size: number): number {
  const h = hash(`${productSlug}:${colorSlug}:${size}`);
  if (h % 9 === 0) return 0;
  return 2 + (h % 14);
}

/* ------------------------------------------------------------------ */
/* Reviews                                                             */
/* ------------------------------------------------------------------ */

const reviewPool: { rating: number; title: string; body: string; author: string }[] = [
  { rating: 5, title: "Exactly as described", body: "Ordered a half size up on the advice of the size guide and it was the right call. Two hundred kilometres in and there is no sign of the midsole packing out.", author: "Dan R." },
  { rating: 5, title: "Worth the money", body: "I have been putting off spending this much on shoes for years. Should not have waited — the difference over my old pair on longer sessions is not subtle.", author: "Priya M." },
  { rating: 4, title: "Great, with one caveat", body: "Performance is excellent. The only thing I would change is the laces, which are slightly too short for a runner's knot. Swapped them and everything is perfect.", author: "Tom H." },
  { rating: 5, title: "Second pair", body: "Bought these once, wore them out, bought them again. There is not much more of a review than that.", author: "Aisha K." },
  { rating: 4, title: "Good fit, narrow toe", body: "Fits true to length but the toe box is on the narrow side. If you have wide feet, size up or look at something else in the range.", author: "Marcus L." },
  { rating: 5, title: "No break-in needed", body: "Wore them straight out of the box for an hour with no hot spots at all. Rare enough that it deserves saying.", author: "Sofia B." },
  { rating: 3, title: "Solid but not special", body: "Nothing wrong with them and they do the job. I just did not find them noticeably better than the pair half the price.", author: "Ollie W." },
  { rating: 5, title: "Grip is the standout", body: "Tried these on a wet surface expecting to be careful and simply did not have to be. Confidence-inspiring in a way I did not expect.", author: "Nina C." },
  { rating: 4, title: "Runs slightly large", body: "Comfortable and well made, but I would go half a size down from my usual. Returns process was painless when I got it wrong first time.", author: "Jonas E." },
  { rating: 5, title: "Held up all season", body: "A full season of twice-weekly use and they still look presentable. The upper has not separated anywhere, which is where my last pair failed.", author: "Ravi S." },
  { rating: 5, title: "Light without feeling flimsy", body: "The weight on the spec sheet made me expect something insubstantial. They feel considerably more solid than the number suggests.", author: "Elena V." },
  { rating: 4, title: "Very good, slightly stiff at first", body: "Took about three sessions to soften up. After that, no complaints at all — would buy again.", author: "Chris P." },
  { rating: 5, title: "Finally, a decent wide fit", body: "Most brands treat wide feet as an afterthought. These have genuine room across the forefoot without being sloppy at the heel.", author: "Grace O." },
  { rating: 4, title: "Looks better in person", body: "The photos do not quite capture the finish. Noticeably more premium in the hand than on screen.", author: "Felix A." },
  { rating: 5, title: "Recommended by my physio", body: "Came to these after some persistent issues. Six weeks in and things are considerably better. Obviously not a medical claim, just my experience.", author: "Hannah D." },
  { rating: 2, title: "Not for me", body: "Well built, but the ride is much firmer than I like. Returned without any hassle and went for the softer model instead.", author: "Sam T." },
  { rating: 5, title: "Best in the range", body: "I own three pairs from this brand now and these are comfortably the ones I reach for first.", author: "Yusuf I." },
  { rating: 4, title: "Great shoe, shame about the colour", body: "Performance is faultless. I just wish the colourway I wanted had been in stock in my size.", author: "Leah G." },
];

/** 3–8 reviews per product, deterministic, never the same set twice. */
export function reviewsFor(productSlug: string) {
  const h = hash(productSlug);
  const count = 3 + (h % 6);
  const start = h % reviewPool.length;
  return Array.from({ length: count }, (_, i) => {
    const r = reviewPool[(start + i * 3) % reviewPool.length];
    return {
      ...r,
      // Spread review dates across the last ~14 months.
      createdAt: new Date(
        Date.now() - ((h + i * 977) % 420) * 24 * 60 * 60 * 1000,
      ),
      verified: (h + i) % 5 !== 0,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

export const seedCollections = [
  {
    slug: "the-race-series",
    name: "The Race Series",
    tagline: "Every gram accounted for",
    description:
      "Three shoes, one purpose. The Race Series is what we build when the only measure that matters is the clock — carbon plates, nitrogen foam, and uppers stripped back to the last thread that earns its place.",
    isFeatured: true,
    productSlugs: ["tempo-elite", "meridian", "aero-fk", "kinetic-2"],
  },
  {
    slug: "matchday",
    name: "Matchday",
    tagline: "Ninety minutes, any surface",
    description:
      "Firm ground, soft ground and everything the British winter puts in between. Boots built around soleplates first and looks second.",
    isFeatured: true,
    productSlugs: ["vantage-fg", "apex-blade-fg", "vantage-sg", "mire-sg", "origin-fg"],
  },
  {
    slug: "hardwood",
    name: "Hardwood",
    tagline: "Traction, mapped",
    description:
      "Our court range, unified by a single outsole pattern derived from three seasons of pivot data. High or mid, the shoe grips the same way.",
    isFeatured: true,
    productSlugs: ["vertex-ht", "current-mt", "tower-ht", "glide-mt", "rampart-ht"],
  },
  {
    slug: "the-monochrome-edit",
    name: "The Monochrome Edit",
    tagline: "Black, white, nothing else",
    description:
      "A curated cut of the range in its most restrained colourways. No volt, no flare, no argument.",
    isFeatured: false,
    productSlugs: ["aero-fk", "anchor-lift", "origin-fg", "cutback-mt", "base-trainer", "eclipse-ht"],
  },
];

/* ------------------------------------------------------------------ */
/* Demo account                                                        */
/* ------------------------------------------------------------------ */

export const demoUser = {
  email: "demo@veloce.com",
  name: "Alex Mercer",
  password: "demo1234",
};
