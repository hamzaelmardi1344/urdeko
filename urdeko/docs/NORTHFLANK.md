# Déploiement UrdeKo sur Northflank

Ce guide décrit le déploiement de **`apps/web`** (Next.js 15) en **conteneur Docker** sur [Northflank](https://northflank.com). Le provisionnement des services externes (Postgres, R2, Inngest, etc.) est le même qu’en production classique : voir [`DEPLOYMENT.md`](./DEPLOYMENT.md) sections **1** (comptes) et **7** (tableau des variables).

Référence officielle : [Deploying Next.js on Northflank](https://northflank.com/guides/deploy-next-js-on-northflank) et [Build with a Dockerfile](https://northflank.com/docs/v1/application/build/build-with-a-dockerfile).

---

## Guide pas à pas (ordre recommandé)

Suis ces étapes **dans l’ordre**. Les détails techniques sont dans les sections suivantes.

### Avant Northflank (à faire une fois)

1. **Code sur GitHub**  
   Pousse le dépôt qui contient le dossier **`urdeko/`** avec le `Dockerfile` à la racine de ce dossier (c’est déjà le cas si tu suis ce repo).

2. **Services externes** (hors Northflank)  
   Prépare au minimum : Postgres (ou tu utiliseras l’addon Northflank), **Redis**, stockage **S3-compatible** (ex. Cloudflare R2), **Sanity**, **Resend**, **Google Gemini**, **Inngest** (clés prod), **Sentry** (DSN), domaine e-mail pour Auth.  
   Liste exacte des variables : [`.env.example`](../.env.example) et [`DEPLOYMENT.md` §1 + §7](./DEPLOYMENT.md).

3. **Token API Northflank**  
   [Créer un token](https://northflank.com/docs/v1/application/secure/manage-api-tokens) (compte ou team) et garde-le pour l’étape 15.

### Projet Northflank

4. **Créer un projet** sur Northflank (ex. nom `urdeko`).

5. **Lier GitHub**  
   Installe l’app Northflank sur ton compte GitHub et autorise le dépôt `hamzaelmardi1344/urdeko` (ou le tien).

6. **Postgres + Redis**  
   Dans le projet, ajoute des **addons** (ou services) **PostgreSQL** et **Redis**. Note les chaînes de connexion : tu les mettras dans `DATABASE_URL` et `REDIS_URL`.

### Créer le service web (build Docker + run)

7. **Nouveau service** de type *combined* (build + déploiement du code).

8. **Dépôt et branche**  
   Choisis le repo GitHub et la branche (ex. `main`).

9. **Type de build**  
   **Dockerfile** (BuildKit par défaut).

10. **Chemins Docker** (indispensable si le code est dans `urdeko/` à la racine du repo)  
    - **Build context** : `/urdeko`  
    - **Dockerfile location** : `/urdeko/Dockerfile`  
    (Si l’UI parle d’un seul champ, l’important est que le *context* soit le dossier qui contient `pnpm-lock.yaml` et le `Dockerfile`.)

11. **Port**  
    Port interne **3000** (c’est celui que l’image utilise).

12. **Variables d’environnement**  
    Soit tu **laisses vide** et tu remplis plus tard avec `pnpm northflank:sync-env` (étape 15), soit tu les remplis **maintenant** : voir **Option B** ci-dessous — en mode **Env**, **Import from file** : un fichier pour *Runtime*, un petit fichier pour *Build arguments* (`NEXT_PUBLIC_*` seulement).

13. **Créer le service**  
    Lance la création. Attends la fin du **premier build** ; en cas d’erreur, lis les logs (souvent chemin Docker ou manque d’ARG `NEXT_PUBLIC_*` — corrigé après sync env + rebuild).

### Après création du service

14. **Récupérer `projectId` et `serviceId`**  
    Dans l’URL ou les paramètres du service sur Northflank (identifiants internes, pas seulement le nom affiché). Tu en auras besoin pour le script.

15. **Configurer toutes les variables (sans cliquer une par une)**  
    - Copie [`.env.northflank.example`](../.env.northflank.example) vers **`.env.northflank.local`** à la racine du dossier **`urdeko/`** sur ta machine.  
    - Remplis `NORTHFLANK_API_TOKEN`, `NORTHFLANK_PROJECT_ID`, `NORTHFLANK_SERVICE_ID` (et `NORTHFLANK_TEAM_ID` si l’API de ton équipe l’exige).  
    - Copie-colle **toutes** les variables applicatives (comme ton `.env.local` prod, mais avec `AUTH_URL` = URL **HTTPS** publique du site Northflank, et **sans** `INNGEST_BASE_URL` en prod cloud).  
    - Depuis **`urdeko/`** : `pnpm northflank:sync-env:dry` pour vérifier, puis `pnpm northflank:sync-env`.  
    - Sur Northflank, **relance un build** du service (les *build arguments* `NEXT_PUBLIC_*` ne s’appliquent qu’au build).

16. **Schéma base de données (Drizzle)**  
    Rien à lancer à la main : au **démarrage du conteneur**, `docker/entrypoint.sh` exécute `drizzle-kit push` avec `DATABASE_URL` (réseau interne Northflank → Postgres OK).  
    Pour désactiver ce pas (debug) : variable runtime **`SKIP_DB_PUSH=1`**.  
    Depuis ton Mac, l’URL `primary.*.addon.code.run` peut rester `ENOTFOUND` : ce n’est plus bloquant pour les migrations.

17. **URL publique et Auth**  
    Note l’URL HTTPS du service (domaine Northflank ou custom). Mets **`AUTH_URL`** à cette valeur (dans `.env.northflank.local` puis `pnpm northflank:sync-env` à nouveau si besoin).  
    Dans **Google Cloud Console** (OAuth), ajoute les redirect URIs pour cette URL (Auth.js).  
    Dans **Sanity** → CORS, ajoute cette origine.

18. **Inngest**  
    Dans le dashboard Inngest, branche l’app sur :  
    `https://<ton-domaine-public>/api/inngest`

19. **Vérifications**  
    Ouvre l’URL dans le navigateur, teste connexion (magic link), création d’un projet minimal, upload si tu peux.

20. **Optionnel**  
    Scraper et Sanity Studio : comme dans [`DEPLOYMENT.md`](./DEPLOYMENT.md) §3 et §4 (autres hébergeurs ou jobs).

---

## Prérequis dans le repo

Sur GitHub, le dépôt peut avoir **plusieurs dossiers à la racine** (maquettes Stitch, etc.) et le **code applicatif** dans le sous-dossier **`urdeko/`**. C’est là que se trouvent le monorepo pnpm, le `Dockerfile` et l’app Next.

- **`urdeko/Dockerfile`** — build monorepo pnpm + Turbo, sortie Next **standalone**.
- **`urdeko/apps/web/next.config.mjs`** — `output: "standalone"`.
- **`urdeko/.dockerignore`**.

Test local (toujours depuis le dossier **`urdeko/`** après `git clone`) :

```bash
docker build -t urdeko-web .
docker run --env-file .env.prod -p 3000:3000 urdeko-web
```

(`SKIP_ENV_VALIDATION=1` est utilisé **pendant le build** dans le Dockerfile ; au **runtime**, toutes les variables requises par `apps/web/src/env.ts` doivent être définies sur Northflank.)

---

## 1. Projet et service Northflank

1. Créer un **projet** Northflank et connecter le **dépôt Git**.
2. Créer un **combined service** (build + run) avec le moteur de build **Dockerfile** / BuildKit.
3. **Où régler le sous-dossier `urdeko/` dans l’UI** : après la section *Repository* (branche, etc.), fais défiler jusqu’aux **Build options** / **Build settings**. Tu dois y voir au minimum :
   - **Dockerfile location** (ou équivalent) : chemin **depuis la racine du dépôt Git** vers le fichier, par ex. **`/urdeko/Dockerfile`** (voir [Build with a Dockerfile](https://northflank.com/docs/v1/application/build/build-with-a-dockerfile)).
   - **Build context** : **`/urdeko`** — c’est le dossier envoyé à `docker build` ; il doit être celui qui contient `Dockerfile`, `pnpm-lock.yaml` et le reste du monorepo (sinon les `COPY` du Dockerfile ne trouvent pas les fichiers).
   - **Ton dépôt GitHub** (plusieurs dossiers à la racine + code dans **`urdeko/`**) : **Build context** = `/urdeko`, **Dockerfile location** = `/urdeko/Dockerfile`. Si la racine Git est déjà le monorepo seul : context `/`, Dockerfile `/Dockerfile`.
4. **Port du conteneur** : **3000** (variable `PORT` déjà fixée dans l’image).
5. **Health check** HTTP : chemin `/` (ou une route légère si tu préfères).

---

## 2. Postgres et Redis

- Ajouter des **addons** (ou services managés) **PostgreSQL** et **Redis** dans le même projet.
- Injecter leurs URLs dans les variables d’environnement du service web :
  - `DATABASE_URL` (Postgres, avec `sslmode=require` si fourni par la plateforme).
  - `REDIS_URL` (souvent `rediss://` en TLS).

Le schéma Drizzle est appliqué **automatiquement** au démarrage du conteneur (`docker/entrypoint.sh` + bundle sous `/app/db-migrate`). Assure-toi que **`DATABASE_URL`** (runtime) pointe vers l’hôte **primary** seul, au format URL `postgresql://…` (pas la forme multi-host avec `,read.`).

Pour appliquer le schéma **depuis ta machine** (optionnel, si Postgres est exposé publiquement) :

```bash
cd urdeko
DATABASE_URL="postgresql://…" pnpm --filter @urdeko/web db:push
```

---

## 3. Variables d’environnement (service web)

### Option A — Fichier local + script (évite la saisie manuelle)

1. Crée un token API : [Manage API tokens](https://northflank.com/docs/v1/application/secure/manage-api-tokens).
2. Récupère **`projectId`** et **`serviceId`** (identifiants internes Northflank : URL du service, onglet *Settings*, ou CLI `northflank get services --projectId …`).
3. Copie [`.env.northflank.example`](../.env.northflank.example) → **`.env.northflank.local`** (déjà ignoré par git via `.env.*.local`).
4. Remplis `NORTHFLANK_*` en tête du fichier, puis **toutes** les variables app (comme `.env.example`).
5. Depuis la racine **`urdeko/`** :

```bash
pnpm northflank:sync-env
# ou : node scripts/sync-northflank-env.mjs chemin/vers/ton.env

# Vérifier le JSON sans appeler l’API :
pnpm northflank:sync-env:dry
```

Le script envoie un `PATCH` sur l’API [combined service](https://northflank.com/docs/v1/api/services/patch-combined-service) avec :

- **`runtimeEnvironment`** : toutes les variables sauf `NORTHFLANK_*` ;
- **`buildArguments`** : uniquement les clés `NEXT_PUBLIC_*` (doublon volontaire pour le build Docker).

Si ton compte utilise une team dans l’URL API, ajoute **`NORTHFLANK_TEAM_ID`** dans le fichier.

Tu peux laisser les champs *Runtime* / *Build arguments* vides à la création du service, créer le service, puis lancer le script une fois le `serviceId` connu.

### Option B — UI Northflank (écran « Environment variables »)

Northflank affiche **(optional)** : pour UrdeKo ce n’est **pas** optionnel — sans variables, le conteneur ne démarrera pas ou le build sera mauvais.

Tu as **deux boîtes** à remplir, pour **deux moments différents** :

| Bloc sur Northflank | Quand c’est utilisé | Contenu pour UrdeKo |
| ------------------- | ------------------- | --------------------- |
| **Runtime variables** | Quand l’app **tourne** (après le déploiement) | Presque tout : `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, S3, Sanity, Inngest, Redis, Sentry, etc. — voir [`.env.example`](../.env.example) |
| **Build arguments** | Pendant le **`docker build`** sur les serveurs Northflank | Seulement les **`NEXT_PUBLIC_*`** (Next les « fige » dans le JS navigateur au build). Au minimum les 3 lignes Sanity + Sentry ci-dessous. |

Tu **n’as pas** besoin de retaper ligne par ligne : en mode **Env**, utilise **Import from file**.

#### Mode « Env » + Import from file — clique dans cet ordre

1. Reste sur l’onglet **Env** (pas JSON si tu n’es pas à l’aise avec le JSON).

2. **Runtime variables**  
   - Sur ton Mac, crée un fichier texte, par ex. `urdeko-runtime.env`.  
   - Mets dedans **une variable par ligne**, format exact : `NOM=valeur` (comme un `.env`).  
   - Copie tout ce dont l’app a besoin : reprends [`.env.example`](../.env.example) comme liste de noms et remplis avec **tes** vraies valeurs (copie depuis ton `.env.local` de prod si tu en as un).  
   - **Ne mets pas** les lignes `NORTHFLANK_*` (ça c’est seulement pour notre script `pnpm northflank:sync-env`, Northflank ne les connaît pas).  
   - Pour la prod Inngest cloud : **ne mets pas** `INNGEST_BASE_URL`, ou laisse-la vide / supprime la ligne.  
   - `AUTH_URL` : mets l’URL **HTTPS** publique du site (domaine Northflank du type `https://…` ou ton domaine). Si tu ne la connais pas encore, mets une URL provisoire, tu la corrigeras après le premier déploiement puis tu mettras à jour ici + OAuth Google.  
   - Dans Northflank, section **Runtime variables** → **Import from file** → choisis `urdeko-runtime.env`.  
   - Si tu vois **« .env file is valid »**, c’est bon : le fichier est lisible.

3. **Build arguments** (bloc plus bas ; déplie-le s’il est replié)  
   - Sur ton Mac, crée un **deuxième** fichier, par ex. `urdeko-build.env`, avec **uniquement** des lignes comme (avec **tes** valeurs) :  
     `NEXT_PUBLIC_SANITY_PROJECT_ID=...`  
     `NEXT_PUBLIC_SANITY_DATASET=production`  
     `NEXT_PUBLIC_SENTRY_DSN=...`  
   - Dans Northflank → **Build arguments** → mode **Env** → **Import from file** → choisis `urdeko-build.env`.  
   - Ce fichier est **court** : pas de `DATABASE_URL` ici, pas de secrets serveur — seulement les `NEXT_PUBLIC_*`.

4. Passe à l’étape suivante de création du service (bouton pour créer / continuer).

#### Si tu préfères ne pas toucher à l’UI du tout

Utilise l’**Option A** (`pnpm northflank:sync-env` avec `.env.northflank.local`) **après** avoir créé le service une première fois, puis relance un build.

---

#### Runtime variables (rappel)

C’est ce que l’app lit au **démarrage** du conteneur (`node apps/web/server.js`). Liste complète : [`.env.example`](../.env.example) et [`DEPLOYMENT.md` §7](./DEPLOYMENT.md).

Tu peux aussi utiliser l’onglet **Secrets** du projet Northflank pour stocker des clés et les référencer au lieu de tout mettre en clair dans un fichier importé.

#### Build arguments (rappel)

Next.js **embarque** les `NEXT_PUBLIC_*` dans le JS client au moment du build : sans ce bloc, le bundle peut sortir sans bon projet Sanity / Sentry.

Le `Dockerfile` passe ces variables en `--build-arg` avant `next build`. Les secrets serveur (`DATABASE_URL`, `AUTH_SECRET`, …) restent **uniquement** dans **Runtime**, pas dans Build arguments.

Points spécifiques Northflank / Docker (en plus de la liste complète ci-dessus) :

| Variable | Remarque |
| -------- | -------- |
| `AUTH_URL` | URL **HTTPS publique** du service (domaine Northflank ou ton domaine custom). |
| `INNGEST_BASE_URL` | **Ne pas définir** en prod cloud (Inngest Cloud) ; laisser vide / absent. |
| `S3_FORCE_PATH_STYLE` | `false` pour Cloudflare R2 et la plupart des API S3 managées. |
| `NEXT_PUBLIC_SENTRY_DSN` | Toujours requis par le schéma Zod ; utiliser un DSN Sentry réel ou un placeholder documenté si tu acceptes de ne pas envoyer d’événements. |

Ajouter **`ADMIN_EMAILS`** (emails autorisés pour `/admin`, séparés par des virgules) si tu utilises le back-office.

Pense à mettre à jour **Google OAuth** (redirects) et **Sanity CORS** avec l’URL publique du déploiement Northflank.

---

## 4. Inngest

Dans le dashboard Inngest (app `urdeko-web`), section **Deploy / Sync** : enregistrer l’URL :

`https://<ton-domaine>/api/inngest`

---

## 5. Domaine et TLS

- Attacher un **domaine custom** au service dans Northflank et suivre les instructions DNS (souvent CNAME vers l’endpoint fourni).
- Remettre **`AUTH_URL`** (et les URLs OAuth / webhooks) sur ce domaine final.

---

## 6. Checklist rapide

- [ ] Build Docker réussit sur Northflank (logs sans erreur Turbo / Next).
- [ ] Toutes les variables `env.ts` renseignées sur le service.
- [ ] `db:push` exécuté contre la base prod.
- [ ] Inngest synchronisé sur `/api/inngest`.
- [ ] Connexion (magic link) et un parcours projet testés sur l’URL prod.

Le scraper (`apps/scraper`) et Sanity Studio restent déployables séparément comme dans [`DEPLOYMENT.md`](./DEPLOYMENT.md) §3 et §4.
