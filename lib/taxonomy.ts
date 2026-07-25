/**
 * The single source of truth for the shop tree. The header mega-menu, the
 * mobile nav, the `/shop/[...category]` catch-all route and the DB seed all
 * read from here, so adding a category is a one-file change.
 *
 * `path` is the URL segment chain below /shop and matches categories.path
 * in the database.
 */

export type TaxonomyNode = {
  slug: string;
  path: string;
  name: string;
  /** Label used for the "view everything in here" link inside the menu. */
  allLabel: string;
  tagline: string;
  description: string;
  children?: TaxonomyNode[];
};

export const taxonomy: TaxonomyNode[] = [
  {
    slug: "sports",
    path: "sports",
    name: "Sports",
    allLabel: "All Sports Shoes",
    tagline: "Built for the clock",
    description:
      "Road, track and gym. Every last built around a single question — what does the athlete need at minute ninety?",
    children: [
      {
        slug: "running",
        path: "sports/running",
        name: "Running",
        allLabel: "All Running Shoes",
        tagline: "Distance, answered",
        description:
          "Plated racers, daily trainers and recovery rides. Energy return tuned to pace, not to marketing.",
      },
      {
        slug: "training",
        path: "sports/training",
        name: "Training",
        allLabel: "All Training Shoes",
        tagline: "Stable under load",
        description:
          "Flat, wide and unshakeable. Built for the lift, the sprint and the twelve rounds in between.",
      },
      {
        slug: "football",
        path: "sports/football",
        name: "Football",
        allLabel: "All Football Shoes",
        tagline: "Grip the turf",
        description:
          "Soleplates engineered surface by surface. Touch that stays honest in the rain.",
        children: [
          {
            slug: "fg",
            path: "sports/football/fg",
            name: "Firm Ground",
            allLabel: "All Firm Ground Boots",
            tagline: "FG — natural grass, dry",
            description:
              "Conical and bladed studs on a split soleplate. Rotational release without losing the bite.",
          },
          {
            slug: "sg",
            path: "sports/football/sg",
            name: "Soft Ground",
            allLabel: "All Soft Ground Boots",
            tagline: "SG — wet, heavy pitches",
            description:
              "Replaceable aluminium studs that dig through the top layer and find the ground underneath.",
          },
        ],
      },
    ],
  },
  {
    slug: "basketball",
    path: "basketball",
    name: "Basketball",
    allLabel: "All Basketball Shoes",
    tagline: "Own the first step",
    description:
      "Containment, cushioning and court feel. Tuned for the stop, not just the sprint.",
    children: [
      {
        slug: "high-top",
        path: "basketball/high-top",
        name: "High Top",
        allLabel: "All High Tops",
        tagline: "Locked at the ankle",
        description:
          "Full collar support for bigs and anyone who lands hard. Maximum containment, zero slop.",
      },
      {
        slug: "mid-top",
        path: "basketball/mid-top",
        name: "Mid Top",
        allLabel: "All Mid Tops",
        tagline: "Free at the ankle",
        description:
          "Cut below the malleolus for guards. Support where it counts, range everywhere else.",
      },
    ],
  },
];

/** Flattens the tree depth-first — used by the seed and by generateStaticParams. */
export function flattenTaxonomy(nodes: TaxonomyNode[] = taxonomy): TaxonomyNode[] {
  return nodes.flatMap((node) => [node, ...flattenTaxonomy(node.children ?? [])]);
}

export function findByPath(path: string): TaxonomyNode | undefined {
  return flattenTaxonomy().find((node) => node.path === path);
}

/** Every path at or below `path` — a parent listing includes its descendants. */
export function descendantPaths(path: string): string[] {
  const node = findByPath(path);
  if (!node) return [];
  return flattenTaxonomy([node]).map((n) => n.path);
}

export type Crumb = { name: string; href: string };

export function breadcrumbsFor(path: string): Crumb[] {
  const segments = path.split("/");
  const crumbs: Crumb[] = [{ name: "Shop", href: "/shop" }];
  let acc = "";
  for (const segment of segments) {
    acc = acc ? `${acc}/${segment}` : segment;
    const node = findByPath(acc);
    if (node) crumbs.push({ name: node.name, href: `/shop/${node.path}` });
  }
  return crumbs;
}

/** Homepage "Featured Categories" — Sports, Football, Basketball. */
export const featuredCategoryPaths = ["sports", "sports/football", "basketball"];
