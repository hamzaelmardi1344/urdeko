import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jibi",
  description: "Boutique mobile-first pour vendeuses Instagram et WhatsApp au Maroc.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
