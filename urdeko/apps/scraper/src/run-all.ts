import { kiteaScraper } from "./scrapers/kitea";
import { mobiliaScraper } from "./scrapers/mobilia";
import { upsertProduct } from "./upsert";
import { normalizedProductSchema } from "./types";

const scrapers = [kiteaScraper, mobiliaScraper];

async function main() {
  console.info("[scraper] Run start");
  for (const scraper of scrapers) {
    console.info(`[scraper] → ${scraper.name}`);
    const products = await scraper.run();
    let ok = 0;
    for (const raw of products) {
      const parsed = normalizedProductSchema.safeParse(raw);
      if (!parsed.success) {
        console.warn(
          `[scraper] ${scraper.name} — skip (${parsed.error.issues[0]?.message})`,
          raw,
        );
        continue;
      }
      try {
        await upsertProduct(parsed.data);
        ok += 1;
      } catch (error) {
        console.warn(
          `[scraper] upsert failed for ${raw.externalId}:`,
          (error as Error).message,
        );
      }
    }
    console.info(`[scraper] ${scraper.name}: ${ok}/${products.length} upserted`);
  }
  console.info("[scraper] Run done");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
