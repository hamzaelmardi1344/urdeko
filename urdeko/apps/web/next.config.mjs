import withPWA from "next-pwa";

// next-pwa@5.6 + Next 15 (App Router only) injecte du code dans le pages router
// (chunk `_document` / `_error`) → casse le prerender de /404.
// Désactivé par défaut, opt-in via ENABLE_PWA=1.
const pwaEnabled = process.env.ENABLE_PWA === "1";
const pwa = withPWA({
  dest: "public",
  disable: !pwaEnabled || process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  // Le plugin workbox de next-pwa 5.6 a des soucis avec certaines routes
  // internes Next 15 (_not-found, api). On les exclut du precache.
  buildExcludes: [/app-build-manifest\.json$/, /middleware-manifest\.json$/],
});

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Image Docker minimale (Fly.io, Railway, k8s, etc.) : trace les deps serveur.
  output: "standalone",
  transpilePackages: ["@urdeko/design-system"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "media.urdeko.app" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "mobilia.ma" },
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "www.kitea.com" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
    // Next 15.5.x tronque par défaut le body à 10 Mo côté middleware/proxy,
    // ce qui fait échouer l'upload photo 20 Mo avec "Unexpected end of form".
    // On relève la limite au-dessus de celle des server actions.
    middlewareClientMaxBodySize: "30mb",
  },
};

export default pwa(nextConfig);
