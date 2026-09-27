/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export → apps/web/out, deployed to Cloudflare Pages (see
  // .github/workflows/deploy.yml). Every route must be renderable at build
  // time; no server runtime, no image optimizer.
  //
  // Two notes on what moved out of this file:
  //   * /build/[shortId] is dynamic, so it is exported once (generateStaticParams
  //     placeholder) and public/_redirects rewrites every share link to it.
  //   * `headers()` does not apply under `output: export`; the same Cache-Control
  //     for /models is served by public/_headers on Cloudflare Pages.
  output: "export",
  images: {
    unoptimized: true,
  },
  experimental: {
    serverComponentsExternalPackages: ["three"],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

module.exports = nextConfig;
