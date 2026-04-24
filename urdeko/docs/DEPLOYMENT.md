# Déploiement UrdeKo

UrdeKo se déploie sur **Vercel** avec quatre services managés autour :

```
                ┌──────────────────────────────────┐
                │  Vercel (Next.js 15 + Cron)      │
                │  ── apps/web (UI + API + jobs)   │
                └──────────────┬───────────────────┘
                               │
        ┌──────────────┬───────┼───────────────┬─────────────┐
        ▼              ▼       ▼               ▼             ▼
   Neon Postgres   Cloudflare R2   Upstash Redis      Resend     Google Gemini
   (DB principale) (médias S3)     (rate limiting)    (emails)   (IA)
```

---

## 1. Provisionnement

### 1.1 Postgres (Neon)
1. Créer un compte sur <https://neon.tech>.
2. Nouveau projet `urdeko` (région EU recommandée).
3. Copier la chaîne pooled (`?sslmode=require`) → `DATABASE_URL`.

### 1.2 Cloudflare R2 (médias)
1. Activer R2 dans le dashboard Cloudflare.
2. Créer un bucket `urdeko-media`, public-read.
3. Créer un token API S3-compatible :
   - `S3_ENDPOINT` : `https://<account>.r2.cloudflarestorage.com`
   - `S3_REGION` : `auto`
   - `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`
   - `S3_BUCKET` : `urdeko-media`
   - `S3_PUBLIC_URL` : URL custom domain (ex `https://media.urdeko.app`)
   - `S3_FORCE_PATH_STYLE` : `false`

### 1.3 Upstash Redis (rate limiting)
1. Compte sur <https://upstash.com>, base Redis serverless EU.
2. Copier l'URL `rediss://...` → `REDIS_URL`.

### 1.4 Google Gemini
1. Créer une clé API sur <https://aistudio.google.com>.
2. Renseigner `GEMINI_API_KEY`.
3. Modèles utilisés : `gemini-2.5-pro` (texte) + `gemini-3.1-flash-image-preview`
   (génération/édition image).

### 1.5 Resend (emails magic-link + notifications)
1. <https://resend.com> → ajouter le domaine `urdeko.app`, vérifier DNS.
2. Créer une API key → `RESEND_API_KEY`.
3. `AUTH_EMAIL_FROM=UrdeKo <hello@urdeko.app>`.

### 1.6 Auth.js
- `AUTH_SECRET` : `openssl rand -base64 48`.
- `AUTH_URL` : URL publique HTTPS (ex `https://urdeko.app`).
- `ADMIN_EMAILS` : liste séparée par `,` des emails autorisés à `/admin`.

### 1.7 Secrets internes
- `INTERNAL_JOB_SECRET` : `openssl rand -hex 32` — protège `/api/jobs/run`.
- `CRON_SECRET` : `openssl rand -hex 16` — Vercel l'envoie au cron via
  `Authorization: Bearer <secret>`. Doit être configuré comme **Environment
  Variable** sur Vercel (pas seulement comme secret cron).

---

## 2. Déploiement Vercel

1. Importer le repo dans Vercel, root directory = `apps/web`.
   (Le monorepo pnpm est détecté automatiquement, Vercel lance
   `pnpm install` puis `next build`.)
2. Coller toutes les variables de [.env.example](../.env.example) dans
   *Project Settings* → *Environment Variables* (Production + Preview).
3. Premier déploiement : Vercel build, `next start` automatique.
4. Migrer le schéma : ouvrir un terminal local avec la `DATABASE_URL`
   prod et exécuter :
   ```bash
   pnpm --filter @urdeko/web db:push
   pnpm --filter @urdeko/web db:seed   # 20 produits curated initiaux
   ```

### Vercel Cron

`apps/web/vercel.json` enregistre un cron hebdo :
```json
{ "crons": [{ "path": "/api/cron/scrape", "schedule": "0 3 * * 0" }] }
```
Vercel ajoute automatiquement le header
`Authorization: Bearer <CRON_SECRET>` aux requêtes de cron.

### Vercel Functions — `maxDuration`

- `/api/jobs/run` : 300 s (Vercel Pro requis).
- `/api/cron/scrape` : 300 s (Vercel Pro requis).

Si tu es sur le plan Hobby, fragmenter le scrape en plusieurs crons par
catégorie pour rester sous 60 s.

---

## 3. Architecture des jobs IA

```
Server Action ── insert ─▶ jobs (status=queued)
              ── fetch ───▶ /api/jobs/run (fire-and-forget)
                            │
                            ├─ analyze_photo (Gemini) → enqueue empty_room
                            ├─ empty_room (Gemini) ────────────────────┐
                            └─ render (Gemini + S3) ─▶ notify email    │
                                                                       │
User ◀── poll /api/projects/[id]/jobs ─────────────────────────────────┘
```

Pas de file externe. La table `jobs` est la source de vérité ; le client
poll `/api/projects/[id]/jobs` pour suivre la progression.

En cas d'échec, l'admin peut relancer un job depuis `/admin/jobs` (action
serveur qui ré-enqueue avec le même `payload`).

---

## 4. Variables d'environnement (résumé)

| Catégorie     | Variables                                         |
| ------------- | ------------------------------------------------- |
| Core          | `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`         |
| Email         | `RESEND_API_KEY`, `AUTH_EMAIL_FROM`               |
| IA            | `GEMINI_API_KEY`, `GEMINI_TEXT_MODEL`, `GEMINI_IMAGE_MODEL`, `AI_*` |
| Stockage      | `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_PUBLIC_URL`, `S3_FORCE_PATH_STYLE` |
| Cache         | `REDIS_URL`                                       |
| Jobs          | `INTERNAL_JOB_SECRET`                             |
| Cron          | `CRON_SECRET`                                     |
| Admin         | `ADMIN_EMAILS`                                    |
| Légal         | `LEGAL_COMPANY_NAME`, `LEGAL_COMPANY_ADDRESS`, `LEGAL_CONTACT_EMAIL` |

---

## 5. Checklist post-déploiement

- [ ] Schéma Drizzle poussé (`db:push`).
- [ ] 20 produits seedés (`db:seed`) — visibles dans `/admin/produits`.
- [ ] Test e2e : créer un projet → upload photo → vérifier que
      `/api/projects/[id]/jobs` passe `analyze_photo` puis `empty_room`.
- [ ] Lancer un render → fichier image apparaît dans R2 +
      e-mail Resend reçu.
- [ ] Cron : déclencher manuellement `/api/cron/scrape` avec le
      `CRON_SECRET` et vérifier l'apparition de nouveaux produits Kitea/Mobilia.

---

## 6. Backup & rollback

- **Postgres** : Neon fait des snapshots quotidiens automatiques + branches.
- **R2** : versioning à activer côté bucket si requis.
- **Code** : Vercel garde l'historique des déploiements, rollback en 1 clic.

---

## 7. Surveillance

- Vercel Logs (route handlers + crons).
- Drizzle Studio en local pour lire l'état de `jobs`/`projects`.
- Vercel Analytics pour le trafic web.
