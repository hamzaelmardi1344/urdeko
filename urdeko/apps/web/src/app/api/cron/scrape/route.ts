import { NextResponse } from "next/server";
import { env } from "@/env";
import { kiteaScraper } from "@/lib/scraper/sites/kitea";
import { mobiliaScraper } from "@/lib/scraper/sites/mobilia";
import type { SiteScraper } from "@/lib/scraper/sites/types";
import { upsertProducts } from "@/lib/scraper/upsert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// =====================================================================
// Vercel Cron : scrape hebdomadaire des catalogues Kitea + Mobilia.
// Authentifié via CRON_SECRET (Vercel injecte automatiquement le header
// `Authorization: Bearer <CRON_SECRET>` quand on configure crons.* dans
// vercel.json — voir https://vercel.com/docs/cron-jobs/manage-cron-jobs).
//
// Limite Vercel Pro : 300s. On boucle séquentiellement sur les sites,
// chaque scraper a sa propre logique de pagination + delay.
// =====================================================================

const SCRAPERS: SiteScraper[] = [kiteaScraper, mobiliaScraper];

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "forbidden" }, { status: 401 });
  }

  const startedAt = Date.now();
  const results: Array<{
    site: string;
    extracted: number;
    imported: number;
    skipped: number;
    errors: number;
    durationMs: number;
  }> = [];

  for (const scraper of SCRAPERS) {
    const siteStart = Date.now();
    try {
      const products = await scraper.run();
      const upsertResult = await upsertProducts(products);
      results.push({
        site: scraper.name,
        extracted: products.length,
        imported: upsertResult.imported,
        skipped: upsertResult.skipped,
        errors: upsertResult.errors.length,
        durationMs: Date.now() - siteStart,
      });
    } catch (error) {
      console.error(`[cron/scrape] ${scraper.name} failed`, error);
      results.push({
        site: scraper.name,
        extracted: 0,
        imported: 0,
        skipped: 0,
        errors: 1,
        durationMs: Date.now() - siteStart,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    totalDurationMs: Date.now() - startedAt,
    results,
  });
}
