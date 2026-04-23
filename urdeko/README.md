# UrdeKo

Application web IA qui transforme une photo de pièce en proposition d'aménagement photoréaliste, avec produits réels sélectionnés selon le style, la palette et le budget de l'utilisateur.

Monorepo pnpm + Turborepo.

## Stack

- **Frontend** : Next.js 15 (App Router, React 19, Server Components), Tailwind v4, PWA installable
- **Backend** : Next.js Route Handlers + Server Actions, Drizzle ORM (Postgres/Neon), Auth.js v5 magic-link
- **IA** : Google Gemini 2.5 Pro (analyse & rédaction) + Gemini 2.5 Flash Image (génération/édition)
- **Jobs asynchrones** : Inngest
- **Catalogue** : Sanity Studio + scraper automatique des enseignes marocaines
- **Stockage médias** : S3-compatible — Cloudflare R2 en prod, MinIO en dev
- **Emails** : Resend + React Email
- **Cache / rate limiting** : Redis (Upstash en prod)

## Arborescence

```
apps/
  web/       Next.js PWA (interface utilisateur + API)
  studio/    Sanity Studio pour l'admin du catalogue produits
  scraper/   Worker Node cron (Inngest) pour l'alimentation auto du catalogue
packages/
  design-system/  Tokens UrdeKo, preset Tailwind, composants partagés
  tsconfig/       Configs TS partagées
  eslint-config/  Config ESLint partagée
```

## Démarrage rapide (dev local avec Docker)

```bash
pnpm install
cp .env.local.example .env.local           # pointe sur la stack Docker
# Édite .env.local pour ajouter GEMINI_API_KEY, RESEND_API_KEY,
# les infos Sanity et les secrets Inngest (dev).
make up                                     # lance Postgres + MinIO + Inngest + Redis
pnpm --filter @urdeko/web db:push           # applique le schéma
pnpm --filter @urdeko/scraper seed          # bootstrap des 20 produits Sanity
pnpm dev                                    # Next.js + Sanity studio
```

Ouvrir http://localhost:3000.

## Variables d'environnement

Toutes les variables listées dans [.env.example](./.env.example) sont
**requises** — l'application refuse de démarrer si l'une d'elles manque.
Ce parti-pris garantit qu'aucun chemin de code n'est silencieusement dégradé
en mode stub. Voir [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) pour le
provisionnement détaillé service par service.

## Corrections appliquées vs les maquettes

Le monorepo part des 20 maquettes HTML situées dans `../` (dossier `stitch_urdeko`). Les incohérences suivantes ont été corrigées :

- Titres uniformisés en français (`New Project` → `Nouveau projet`, `Select Elements` → `Choisir les éléments`).
- Budget projet = unique source de vérité issue de la saisie initiale, propagé dans tous les écrans.
- Flow remis dans l'ordre logique : photo avant style/palette.
- Config Tailwind extraite vers `packages/design-system` (remplace les configs dupliquées).

## Scripts utiles

| Commande                               | Description                                    |
| -------------------------------------- | ---------------------------------------------- |
| `pnpm dev`                             | Lance web + studio + scraper en parallèle      |
| `pnpm build`                           | Build prod de toutes les apps                  |
| `pnpm --filter @urdeko/web db:push`    | Applique le schéma Drizzle à la DB             |
| `pnpm --filter @urdeko/web db:studio`  | Drizzle Studio (explorateur DB)                |
| `pnpm --filter @urdeko/web test`       | Tests E2E Playwright sur le flow critique      |
| `pnpm --filter @urdeko/scraper scrape` | Lance un run de scraping catalogue à la main   |

## Déploiement

- **Web** → Vercel (détection automatique Next.js 15)
- **Studio** → Sanity Cloud (`pnpm --filter @urdeko/studio deploy`)
- **Scraper** → Inngest Cloud (cron hebdomadaire, configuré dans le code)
- **DB** → Neon Postgres (branche principale + branches preview)
- **Médias** → Cloudflare R2 avec custom domain

Guides détaillés : [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) et
[docs/ADMIN.md](./docs/ADMIN.md).
