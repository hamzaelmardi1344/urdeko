import { notFound } from "next/navigation";
import { StorefrontClient } from "@/components/storefront-client";
import { getStorefront } from "@/api/storefront";
import "./storefront.css";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function StorefrontPage({ params }: PageProps) {
  const { slug } = await params;
  try {
    const storefront = await getStorefront(slug);
    return <StorefrontClient shop={storefront.shop} products={storefront.products} />;
  } catch {
    notFound();
  }
}
