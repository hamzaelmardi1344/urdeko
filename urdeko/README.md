# UrdeKo

Application web IA qui transforme une photo de pièce en proposition d'aménagement photoréaliste, avec produits réels sélectionnés selon le style, la palette et le budget de l'utilisateur.

Monorepo pnpm + Turborepo.

## Stack

- **Frontend** : Next.js 15 (App Router, React 19, Server Components), Tailwind v4, PWA installable
- **Backend** : Next.js Route Handlers + Server Actions, Drizzle ORM (Postgres/Neon), Auth.js v5 magic-link
- **IA** : Google Gemini 2.5 Pro (analyse & rédaction) + Gemini 2.5 Flash Image (génération/édition)
- **Jobs asynchrones** : table `jobs` Postgres + endpoint interne `/api/jobs/run` avec `maxDuration:300` (Vercel Pro)
- **Catalogue** : table `products` Postgres + scraper hebdo via Vercel Cron
- **Stockage médias** : S3-compatible — Cloudflare R2 en prod, MinIO en dev
- **Emails** : SMTP (ex. Gmail) + React Email
- **Cache / rate limiting** : Redis (Upstash en prod)

## Arborescence

```
apps/
  web/       Next.js PWA (interface utilisateur + API + jobs + cron)
packages/
  design-system/  Tokens UrdeKo, preset Tailwind, composants partagés
  tsconfig/       Configs TS partagées
  eslint-config/  Config ESLint partagée
```

## Démarrage rapide (dev local avec Docker)

```bash
pnpm install
cp .env.local.example .env.local           # pointe sur la stack Docker
# Édite .env.local pour ajouter GEMINI_API_KEY, SMTP_USER et SMTP_PASSWORD.
make up                                     # lance Postgres + MinIO + Redis
pnpm --filter @urdeko/web db:push           # applique le schéma
pnpm --filter @urdeko/web db:seed           # bootstrap des 20 produits curated
pnpm dev                                    # Next.js
```

Ouvrir http://localhost:3300.

## Variables d'environnement

Toutes les variables listées dans [.env.example](./.env.example) sont
**requises** — l'application refuse de démarrer si l'une d'elles manque.
Ce parti-pris garantit qu'aucun chemin de code n'est silencieusement dégradé
en mode stub. Voir [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) pour le
provisionnement détaillé service par service.

## Architecture des jobs IA

```
User → Server Action ── insert ──▶ jobs table (status=queued)
                       ── fetch ──▶ /api/jobs/run (fire-and-forget)
                                    │
                                    ├─ Gemini (analyze / empty room / render)
                                    ├─ S3 / R2 (upload images)
                                    └─ update jobs (status=succeeded|failed)

User polls GET /api/projects/[id]/jobs ── status / progress
```

Pas de broker externe : la file est en Postgres, l'exécution se fait dans une
fonction Vercel avec `maxDuration:300`. Le scrape hebdo Kitea/Mobilia tourne via
Vercel Cron (cf. `apps/web/vercel.json`).

## Scripts utiles

| Commande                               | Description                                    |
| -------------------------------------- | ---------------------------------------------- |
| `pnpm dev`                             | Lance le web en dev                            |
| `pnpm build`                           | Build prod                                     |
| `pnpm --filter @urdeko/web db:push`    | Applique le schéma Drizzle à la DB             |
| `pnpm --filter @urdeko/web db:seed`    | Insère les 20 produits curated dans Postgres   |
| `pnpm --filter @urdeko/web db:studio`  | Drizzle Studio (explorateur DB)                |
| `pnpm --filter @urdeko/web test`       | Tests E2E Playwright sur le flow critique      |

## Déploiement

- **Web** → Vercel (détection automatique Next.js 15, `vercel.json` pour les crons)
- **DB** → Neon Postgres (branche principale + branches preview)
- **Médias** → Cloudflare R2 avec custom domain
- **Cache** → Upstash Redis

Guides détaillés : [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) et
[docs/ADMIN.md](./docs/ADMIN.md).
