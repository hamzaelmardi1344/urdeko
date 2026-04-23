import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "UrdeKo — Design d'intérieur IA",
    template: "UrdeKo — %s",
  },
  description:
    "Transformez votre pièce à partir d'une simple photo. UrdeKo génère une proposition d'aménagement personnalisée selon votre style et votre budget.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    title: "UrdeKo",
    capable: true,
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "UrdeKo — Design d'intérieur IA",
    description:
      "Transformez votre pièce à partir d'une simple photo. Produits sélectionnés selon votre style et votre budget.",
    type: "website",
    locale: "fr_MA",
  },
};

export const viewport: Viewport = {
  themeColor: "#a63300",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={manrope.variable}>
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- Material Symbols (pas dans next/font) */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className="bg-surface text-on-surface">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
