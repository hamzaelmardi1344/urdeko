import withPWA from "next-pwa";
import { withSentryConfig } from "@sentry/nextjs";

// DISABLE_PWA=1 permet de désactiver next-pwa pour débugger un build cassé.
// En dev, il est déjà désactivé par défaut (next-pwa bypass).
const pwa = withPWA({
  dest: "public",
  disable:
    process.env.NODE_ENV === "development" || process.env.DISABLE_PWA === "1",
  register: true,
  skipWaiting: true,
  // Le plugin workbox de next-pwa 5.6 a des soucis avec certaines routes
  // internes Next 15 (_not-found, api). On les exclut du precache.
  buildExcludes: [/app-build-manifest\.json$/, /middleware-manifest\.json$/],
});

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Image Docker minimale (Northflank, Fly, etc.) : trace les deps serveur.
  output: "standalone",
  transpilePackages: ["@urdeko/design-system"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "cdn.sanity.io" },
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

const withPwa = pwa(nextConfig);

// On enveloppe avec Sentry uniquement si un DSN est configuré, pour
// éviter d'échouer le build local si l'utilisateur n'a pas encore
// provisionné Sentry.
const sentryEnabled = Boolean(
  process.env.NEXT_PUBLIC_SENTRY_DSN &&
    !process.env.NEXT_PUBLIC_SENTRY_DSN.startsWith("https://dummy"),
);

export default sentryEnabled
  ? withSentryConfig(withPwa, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      widenClientFileUpload: true,
      hideSourceMaps: true,
      disableLogger: true,
    })
  : withPwa;
