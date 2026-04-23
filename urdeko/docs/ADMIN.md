# Guide admin — UrdeKo

## Environnement

- Web : Vercel (branche `main` → `urdeko.app`, branches → previews)
- DB : Neon (projet `urdeko-prod`, branche `main` + branches preview)
- Médias : Cloudflare R2 (bucket `urdeko`, custom domain `media.urdeko.app`)
- Catalogue : Sanity Cloud (`urdeko` project)
- Jobs : Inngest Cloud (`urdeko` app)
- Emails : Resend (`hello@urdeko.app`)
- Obs : Sentry `urdeko-web` + Vercel Analytics

## Ajouter un produit manuellement

1. Ouvrir le studio Sanity (`studio.urdeko.app`).
2. **Content → Produit → Create new**.
3. Remplir le nom, la marque, la catégorie, le prix MAD, les styles compatibles.
4. Uploader l'image principale carrée (1000×1000 conseillé).
5. **Source : saisie manuelle**.
6. Cliquer **Publish**. Le catalogue web est invalidé via webhook dans les 10 secondes.

## Superviser les rendus

- **Jobs UrdeKo** (table `jobs`) : chaque génération est tracée avec `status`, `progress`, `error`.
- Onglet Inngest "Runs" pour rejouer un job `render-project` en cas d'échec.
- Onglet Sentry pour les erreurs non gérées (ex. Gemini timeout).

## Scraper

Cron hebdomadaire Inngest `urdeko-scraper/catalogue-weekly` le dimanche à 03h UTC.
Logs consultables dans Inngest Cloud → Functions.

## Contacts

- Tech / IA : _à compléter_
- Catalogue : _à compléter_
- Support : `hello@urdeko.app`
