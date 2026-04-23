import { Inngest } from "inngest";
import { kiteaScraper } from "./scrapers/kitea";
import { mobiliaScraper } from "./scrapers/mobilia";
import { upsertProduct } from "./upsert";
import { normalizedProductSchema } from "./types";

// Cron hebdomadaire (dimanche 03h00 UTC) — deploye sur Inngest Cloud.
export const inngest = new Inngest({
  id: "urdeko-scraper",
  name: "UrdeKo scraper",
  eventKey: process.env.INNGEST_EVENT_KEY,
  signingKey: process.env.INNGEST_SIGNING_KEY,
});

const scrapers = [kiteaScraper, mobiliaScraper];

export const weeklyScrape = inngest.createFunction(
  { id: "catalogue-weekly", retries: 1 },
  { cron: "0 3 * * 0" },
  async ({ step, logger }) => {
    for (const scraper of scrapers) {
      await step.run(`scrape-${scraper.name}`, async () => {
        const products = await scraper.run();
        logger.info(`${scraper.name}: ${products.length} found`);
        for (const raw of products) {
          const parsed = normalizedProductSchema.safeParse(raw);
          if (!parsed.success) continue;
          try {
            await upsertProduct(parsed.data);
          } catch (error) {
            logger.warn(`upsert failed for ${raw.externalId}`, error as Error);
          }
        }
      });
    }
  },
);

export const manualScrape = inngest.createFunction(
  { id: "catalogue-manual", retries: 0 },
  { event: "urdeko/scraper.manual" },
  async ({ step, logger }) => {
    for (const scraper of scrapers) {
      await step.run(`scrape-${scraper.name}`, async () => {
        const products = await scraper.run();
        logger.info(`${scraper.name}: ${products.length} found`);
        for (const raw of products) {
          const parsed = normalizedProductSchema.safeParse(raw);
          if (!parsed.success) continue;
          try {
            await upsertProduct(parsed.data);
          } catch (error) {
            logger.warn(`upsert failed for ${raw.externalId}`, error as Error);
          }
        }
      });
    }
  },
);

export const functions = [weeklyScrape, manualScrape];
