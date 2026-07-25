import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // All product photography is local (public/products), so no remote
    // patterns are needed. AVIF first — the plates are photographic and
    // compress substantially better than WebP at the same quality.
    formats: ["image/avif", "image/webp"],
    // Matches the breakpoints the product grid actually requests.
    deviceSizes: [390, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [56, 64, 80, 96, 144, 256, 384],
  },

  experimental: {
    // Only pull in the icons actually imported rather than the whole set.
    optimizePackageImports: ["lucide-react", "motion"],
  },

  // `pg` is a native-ish driver and must stay external to the server bundle.
  serverExternalPackages: ["pg"],

  webpack: (config, { dev }) => {
    // This project lives in a OneDrive-synced folder. OneDrive races with
    // webpack's persistent `.next/cache/*.pack.gz` writes, deleting them
    // mid-flush; the resulting unhandled ENOENT rejections corrupt the dev
    // compile and, in the worst case, stop CSS chunks from being emitted at
    // all. Using an in-memory cache in dev sidesteps the contention entirely.
    // Production (`next build`) is unaffected — it doesn't use this cache.
    if (dev) config.cache = { type: "memory" };
    return config;
  },
};

export default nextConfig;
