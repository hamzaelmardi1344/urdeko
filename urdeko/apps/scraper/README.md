# UrdeKo scraper

Worker Node qui alimente le catalogue Sanity avec les produits de Kitea, Mobilia et IKEA Maroc.

## Commandes

```bash
pnpm --filter @urdeko/scraper scrape      # run manuel
pnpm --filter @urdeko/scraper dev         # watcher pour iterer sur les selecteurs
pnpm --filter @urdeko/scraper typecheck
```

## Architecture

- `src/types.ts` — schéma Zod du produit normalisé.
- `src/scrapers/*.ts` — un scraper par enseigne. Retourne une liste de `NormalizedProduct`.
- `src/upsert.ts` — upload de l'image et upsert dans Sanity via `@sanity/client`.
- `src/run-all.ts` — exécution CLI (appelée manuellement ou en cron local).
- `src/inngest.ts` — exécution planifiée (cron hebdomadaire) à déployer sur Inngest Cloud.

## Ethique du scraping

- Respecter `robots.txt` de chaque enseigne.
- User-Agent identifiable : `UrdekoBot/1.0 (+https://urdeko.app/robots)`.
- Délai de 1,5s entre chaque requête.
- Cache en cas de succès (à ajouter : table `scraper_cache` keyed by sourceUrl + hash image).

## Statut

- `kitea` — squelette fonctionnel (pagination et headless à ajouter avant prod).
- `mobilia` — à finaliser une fois les sélecteurs DOM stabilisés.
- `ikea` — préférer l'API officielle IKEA quand possible.
