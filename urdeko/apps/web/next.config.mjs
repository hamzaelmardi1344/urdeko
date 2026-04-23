import withPWA from "next-pwa";
import { withSentryConfig } from "@sentry/nextjs";

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

// Sentry est opt-in via ENABLE_SENTRY=1 + DSN. Le wrapper SDK v8 instrumente
// le pages router (`_document` / `_error`) ce qui peut casser le prerender de
// /404 sur un projet App-Router-only ; on évite tant qu’on n’a pas migré vers
// `app/global-error.tsx` + `Sentry.captureRouterTransitionStart` côté client.
const sentryEnabled =
  process.env.ENABLE_SENTRY === "1" &&
  Boolean(
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
      sourcemaps: { deleteSourcemapsAfterUpload: true },
      autoInstrumentServerFunctions: false,
      autoInstrumentMiddleware: false,
      excludeServerRoutes: ["/_error", "/404", "/500"],
    })
  : withPwa;
