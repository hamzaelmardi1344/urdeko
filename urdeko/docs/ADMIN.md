# Admin opérateur — UrdeKo

## Comptes / accès

- **`ADMIN_EMAILS` (Vercel)** : liste des emails autorisés pour `/admin`, **minuscules**, séparés par des virgules, sans espaces autour (ex. `hamza@gmail.com`). Doit **coller exactement** à l’email avec lequel tu te connectes (magic link). Sinon tu es redirigé vers `/acces-admin-refuse`.
- App Vercel : `urdeko-web`
- DB : Neon `urdeko-prod` (lecture/écriture via psql)
- Catalogue : table Postgres `products` (admin via `/admin/produits`)
- Jobs : table Postgres `jobs` (admin via `/admin/jobs`)
- Stockage : Cloudflare R2 bucket `urdeko-media`
- Cron : Vercel Crons (cf. `apps/web/vercel.json`)

## Ajouter un produit manuellement

1. Ouvrir `/admin/produits` (réservé aux emails listés dans `ADMIN_EMAILS`).
2. Cliquer "Importer depuis le web" pour utiliser le scraper universel
   (URL produit → extraction JSON-LD/OpenGraph/heuristique).
3. Ou lancer en local `pnpm --filter @urdeko/web db:seed` pour réinjecter
   les 20 produits curated bootstrap.

## Surveillance des jobs

- Onglet "Jobs" du dashboard (`/admin/jobs`) liste les runs `queued`,
  `running`, `succeeded`, `failed` avec retry possible (re-enqueue).
- Logs détaillés : Vercel → Logs → filter par route `/api/jobs/run`.

## Scraper hebdo

Vercel Cron `0 3 * * 0` (dimanche 03h UTC) appelle `/api/cron/scrape`
authentifié par `CRON_SECRET`. Logs dans Vercel → Logs.

Lancement manuel :
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://urdeko.app/api/cron/scrape
```
