import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "UrdeKo Admin",
    template: "%s · UrdeKo Admin",
  },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
