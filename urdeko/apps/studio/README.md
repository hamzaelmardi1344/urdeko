# UrdeKo Studio

Studio Sanity pour la gestion du catalogue produits UrdeKo.

## Démarrage

```bash
# a la racine du monorepo
pnpm install
cp apps/studio/.env.example apps/studio/.env.development
pnpm --filter @urdeko/studio dev
```

Ouvrir <http://localhost:3333>.

## Structure

- `schemas/product.ts` — type `product` : nom, marque, catégorie, prix MAD, image, styles, tags, source (manual|scraped), sourceUrl.
- Les produits `source="scraped"` sont upsertés par le worker `apps/scraper` (voir `apps/scraper/README.md`).

## Workflow de publication

1. L'admin UrdeKo ajoute ou édite un produit manuellement dans le studio.
2. Le scraper worker ajoute/met à jour en parallèle les produits scrapés.
3. A chaque publication, Sanity émet un webhook vers `/api/sanity/revalidate` de l'app web qui invalide les tags `products` et `products:{category}`.
