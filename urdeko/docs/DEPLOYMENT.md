# Déploiement UrdeKo — guide pas-à-pas

Ce guide détaille la mise en production complète, depuis la création des
comptes externes jusqu'à la mise en route de Vercel. Il complète
[`README.md`](../README.md) (stack locale Docker) et
[`ADMIN.md`](./ADMIN.md) (opérations courantes).

---

## 0. Vue d'ensemble

### Stack locale (Docker Compose)

```
┌─────────────┐   ┌─────────────┐   ┌──────────────┐
│ pnpm dev    │──▶│ Next.js 15  │──▶│ Postgres 16  │
│ apps/web    │   │ port 3000   │   │ docker:5432  │
└─────────────┘   └──────┬──────┘   └──────────────┘
                         │
        ┌────────────────┼─────────────────┬──────────────┐
        ▼                ▼                 ▼              ▼
  ┌───────────┐   ┌────────────┐   ┌───────────────┐  ┌────────┐
  │ MinIO S3  │   │ Inngest    │   │ Redis rate    │  │ Sanity │
  │ :9000/9001│   │ dev :8288  │   │ limit :6379   │  │ Cloud  │
  └───────────┘   └────────────┘   └───────────────┘  └────────┘
```

### Stack production

```
          ┌──────────────────────────────────────────┐
          │ Vercel — apps/web                        │
          │  Next.js 15 (edge + node, PWA)           │
          │  Auth.js v5  ·  Sentry  ·  Analytics     │
          └─────┬──────────────┬──────────┬──────────┘
                │              │          │
        ┌───────▼──┐   ┌───────▼──┐  ┌────▼────────┐
        │ Neon     │   │ Inngest  │  │ Cloudflare  │
        │ Postgres │   │ Cloud    │  │ R2 (S3)     │
        └──────────┘   └────┬─────┘  └─────────────┘
                            │
                   ┌────────▼──────────┐     ┌──────────┐
                   │ Render/Fly        │     │ Resend   │
                   │ apps/scraper      │     │ emails   │
                   │ (Inngest HTTP)    │     └──────────┘
                   └────────┬──────────┘
                            │
                   ┌────────▼──────────┐     ┌──────────┐
                   │ Sanity Cloud      │     │ Google   │
                   │ catalogue produits│     │ Gemini   │
                   └───────────────────┘     └──────────┘
                                             ┌──────────┐
                                             │ Upstash  │
                                             │ Redis    │
                                             └──────────┘
```

---

## 1. Création des comptes et provisionnement

Suivre l'ordre ci-dessous. Chaque section précise **ce que tu copies** pour la
configuration Vercel finale (section 7).

### 1.1 Neon (Postgres serverless)

1. Créer un compte <https://neon.tech>.
2. Nouveau projet `urdeko-prod`, région `eu-central-1` (Frankfurt) — plus proche
   du Maroc.
3. Dans *Connection details*, sélectionner l'utilisateur **owner** et copier la
   chaîne `postgresql://...?sslmode=require`.
4. **Copier** : `DATABASE_URL`.

### 1.2 Cloudflare R2 (stockage objets S3-compatible)

1. Créer un compte <https://dash.cloudflare.com>.
2. *R2* → *Create bucket* `urdeko` (région *EEUR* recommandée).
3. *Settings* du bucket → *Public access* : activer **Allow Public Access**
   puis *Connect a custom domain* `media.urdeko.app` (CNAME Cloudflare).
4. *Manage R2 API Tokens* → *Create API Token* avec permission *Object Read +
   Write* sur le bucket.
5. **Copier** :
   - `S3_ENDPOINT` → `https://<account_id>.r2.cloudflarestorage.com`
   - `S3_REGION` → `auto`
   - `S3_ACCESS_KEY_ID` + `S3_SECRET_ACCESS_KEY`
   - `S3_BUCKET` → `urdeko`
   - `S3_PUBLIC_URL` → `https://media.urdeko.app`
   - `S3_FORCE_PATH_STYLE` → `false`

### 1.3 Sanity (catalogue produits)

1. Créer un compte <https://sanity.io>.
2. Nouveau projet `urdeko`, dataset `production`, mode *Public* lecture.
3. *API* → *Tokens* → créer un token **Editor** (write) puis un token
   **Viewer** (read).
4. *API* → *CORS origins* → ajouter `https://urdeko.app`,
   `https://*.vercel.app`, `http://localhost:3000`.
5. *API* → *Webhooks* → créer un webhook `On publish` pointant vers
   `https://urdeko.app/api/sanity/revalidate` (secret = valeur
   `SANITY_REVALIDATE_SECRET` ≥ 16 caractères).
6. **Copier** :
   - `NEXT_PUBLIC_SANITY_PROJECT_ID`
   - `NEXT_PUBLIC_SANITY_DATASET` → `production`
   - `SANITY_API_TOKEN` (Editor)
   - `SANITY_REVALIDATE_SECRET` (celui du webhook)

### 1.4 Inngest (orchestrateur IA)

1. Créer un compte <https://inngest.com>.
2. Créer une app `urdeko-web` et une app `urdeko-scraper`.
3. Pour chaque app, *Keys* → récupérer `INNGEST_EVENT_KEY` et
   `INNGEST_SIGNING_KEY`.
4. *Apps* → *Deploy* → ajouter l'URL :
   - `urdeko-web` : `https://urdeko.app/api/inngest`
   - `urdeko-scraper` : `https://scraper.urdeko.app/api/inngest`

### 1.5 Resend (e-mails transactionnels)

1. Créer un compte <https://resend.com>.
2. *Domains* → ajouter `urdeko.app`, publier les DNS TXT/CNAME SPF/DKIM.
3. *API Keys* → créer une clé *Full access*.
4. **Copier** :
   - `RESEND_API_KEY`
   - `AUTH_EMAIL_FROM` → `UrdeKo <bonjour@urdeko.app>`

### 1.6 Google Gemini

1. <https://aistudio.google.com> → *Get API key* → créer la clé dans un projet
   GCP dédié `urdeko-ai`.
2. Console GCP → *IAM & Admin* → activer la facturation, quotas suggérés :
   - `gemini-2.5-pro` — 60 requêtes/min
   - `gemini-2.5-flash-image` — 30 requêtes/min
3. **Copier** :
   - `GEMINI_API_KEY`
   - `GEMINI_TEXT_MODEL` → `gemini-2.5-pro`
   - `GEMINI_IMAGE_MODEL` → `gemini-2.5-flash-image`

### 1.7 Upstash Redis (rate limiting)

1. <https://upstash.com> → *Create database* global, région `eu-west-1`.
2. *Details* → copier la connection string **TLS** (commence par `rediss://`).
3. **Copier** : `REDIS_URL`.

### 1.8 Sentry

1. <https://sentry.io> → créer un org `urdeko`.
2. Créer deux projets : `urdeko-web` (Next.js) et `urdeko-scraper` (Node).
3. *Client Keys (DSN)* → copier les DSN.
4. *Auth Tokens* → *Personal tokens* → générer un token avec scope
   `project:releases`.
5. **Copier** :
   - `NEXT_PUBLIC_SENTRY_DSN` (projet web)
   - `SENTRY_AUTH_TOKEN`
   - `SENTRY_ORG` → `urdeko`
   - `SENTRY_PROJECT` → `urdeko-web`

### 1.9 Auth.js

1. Générer un secret robuste :
   ```bash
   openssl rand -hex 32
   ```
2. **Copier** :
   - `AUTH_SECRET`
   - `AUTH_URL` → `https://urdeko.app`

---

## 2. Base de données : schéma + seed

```bash
# Une fois DATABASE_URL renseigné
pnpm --filter @urdeko/web db:generate   # si modifs du schéma
pnpm --filter @urdeko/web db:push       # pousse vers Neon
```

### Peupler le catalogue produits (bootstrap)

```bash
# Remplit Sanity avec 20 produits marocains curated + images libres
pnpm --filter @urdeko/scraper seed
```

Relançable à volonté (idempotent, chaque produit a un `_id` stable).

### Scrape Kitea + Mobilia (automatisé)

Une fois `urdeko-scraper` déployé et connecté à Inngest Cloud, le scraper
hebdomadaire s'exécute chaque lundi 06:00 UTC. Pour lancer manuellement :

```bash
# En local (ne pousse pas vers Sanity si pas de token écriture)
pnpm --filter @urdeko/scraper scrape
```

Ou depuis Inngest Cloud → *Events* → envoyer `urdeko/scrape.manual`.

---

## 3. Déploiement de `apps/scraper` (service Inngest)

Le scraper est un petit service Node qui expose `/api/inngest`. Deux options
testées :

### 3.1 Render (recommandé, zéro-config)

1. <https://render.com> → *New Web Service* → GitHub repo `urdeko`.
2. *Root directory* : `apps/scraper`.
3. *Build command* : `pnpm install --filter @urdeko/scraper && pnpm --filter @urdeko/scraper build`
4. *Start command* : `pnpm --filter @urdeko/scraper start`
5. *Environment* :
   - `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`
   - `NEXT_PUBLIC_SANITY_PROJECT_ID`, `SANITY_API_TOKEN`,
     `NEXT_PUBLIC_SANITY_DATASET`
   - `PORT` → `3030`
6. *Custom domain* → `scraper.urdeko.app`.
7. Retourner sur Inngest Cloud → *Apps* → *Deploy* → vérifier que
   `https://scraper.urdeko.app/api/inngest` est découvert.

### 3.2 Fly.io (alternative, Dockerfile fourni)

```bash
fly launch --dockerfile apps/scraper/Dockerfile --copy-config
fly secrets set INNGEST_EVENT_KEY=... INNGEST_SIGNING_KEY=... \
                SANITY_API_TOKEN=... NEXT_PUBLIC_SANITY_PROJECT_ID=... \
                NEXT_PUBLIC_SANITY_DATASET=production
```

---

## 4. Déploiement de `apps/studio` (Sanity Studio)

```bash
pnpm --filter @urdeko/studio exec sanity deploy
# Choisir un hostname : urdeko.sanity.studio
```

Accès : `https://urdeko.sanity.studio`.

---

## 5. Vercel (frontend + routes)

1. <https://vercel.com/new> → importer le repo.
2. *Root directory* : `apps/web`.
3. *Framework preset* : Next.js.
4. *Build command* : `cd ../.. && pnpm turbo run build --filter=@urdeko/web`
5. *Install command* : `pnpm install --frozen-lockfile`
6. *Output directory* : `.next` (défaut).

### Environment variables (Production + Preview)

Toutes les variables listées dans `.env.example` **sont requises**. Valeurs
collectées aux sections 1.x.

### Domaine

- Ajouter `urdeko.app` (apex) et `www.urdeko.app` → redirect 301 vers apex.
- Configurer les DNS (CNAME / ALIAS) côté Cloudflare.
- Forcer HTTPS + HSTS.

### Webhooks entrants à enregistrer

| Source                | URL                                             |
| --------------------- | ----------------------------------------------- |
| Sanity (on publish)   | `https://urdeko.app/api/sanity/revalidate`       |
| Inngest (par app)     | `https://urdeko.app/api/inngest` (auto découvert)|

---

## 6. Post-déploiement

### 6.1 Checklist go-live

- [ ] `pnpm --filter @urdeko/web db:push` contre Neon `prod`.
- [ ] `pnpm --filter @urdeko/scraper seed` pour garantir ≥ 20 produits.
- [ ] Test magic-link depuis un e-mail perso (Resend domain vérifié ?).
- [ ] Upload photo réel → analyse Gemini < 20 s → rendu < 90 s.
- [ ] `https://urdeko.app/manifest.webmanifest` répond 200.
- [ ] Lighthouse mobile ≥ 90 (Performance, Accessibility, Best practices, SEO).
- [ ] Sentry capte une erreur simulée (bouton test `/api/debug/throw`).
- [ ] Rate limiting : 15 uploads consécutifs → 429 au-delà du 10ᵉ.
- [ ] Pages légales accessibles : `/mentions-legales`, `/cgu`,
      `/confidentialite`.

### 6.2 Audit Lighthouse

```bash
npx lighthouse https://urdeko.app --preset=mobile --output=html \
  --output-path=./lighthouse-prod.html
```

Objectifs :

| Catégorie       | Seuil |
| --------------- | ----- |
| Performance     | ≥ 90  |
| Accessibility   | ≥ 95  |
| Best practices  | ≥ 95  |
| SEO             | ≥ 90  |
| PWA installable | ✓     |

### 6.3 Monitoring quotidien

Voir [`ADMIN.md`](./ADMIN.md) pour :
- Dashboards (Vercel Analytics, Inngest, Sentry).
- Process d'ajout produit (Sanity Studio).
- Rejouer un job échoué.

---

## 7. Récapitulatif des variables

| Catégorie        | Variable                          | Où la trouver                                |
| ---------------- | --------------------------------- | -------------------------------------------- |
| Core             | `DATABASE_URL`                    | Neon §1.1                                    |
|                  | `AUTH_SECRET`                     | `openssl rand -hex 32` §1.9                  |
|                  | `AUTH_URL`                        | `https://urdeko.app`                         |
| Email            | `RESEND_API_KEY`, `AUTH_EMAIL_FROM`| Resend §1.5                                 |
| AI               | `GEMINI_API_KEY`, `GEMINI_TEXT_MODEL`, `GEMINI_IMAGE_MODEL` | Google §1.6       |
| Stockage         | `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_PUBLIC_URL`, `S3_FORCE_PATH_STYLE` | R2 §1.2 |
| CMS              | `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `SANITY_API_TOKEN`, `SANITY_REVALIDATE_SECRET` | Sanity §1.3 |
| Inngest          | `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `INNGEST_BASE_URL` (prod: vide) | Inngest §1.4 |
| Redis            | `REDIS_URL`                        | Upstash §1.7                                |
| Observabilité    | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Sentry §1.8 |
| Légal            | `LEGAL_COMPANY_NAME`, `LEGAL_COMPANY_ADDRESS`, `LEGAL_CONTACT_EMAIL` | Statuts société |

---

## 8. Restauration / DR

- **Base Postgres** : Neon conserve 7 jours de *Point-in-time recovery*. En
  cas de perte : *Restore branch* depuis le dashboard.
- **Fichiers R2** : activer *Object lifecycle* → versioning 30 jours.
- **Sanity** : *History* par document + export dataset quotidien via
  `sanity dataset export production`.
- **Inngest** : rejouable depuis le dashboard (jobs idempotents).
