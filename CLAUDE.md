# CLAUDE.md — formation-sante-bienetre

Contexte projet pour Claude Code / Claude Desktop. Lu automatiquement à chaque session.
Public : agrégateur de formations CPF (vertical **beauté & bien-être**), modèle **leads captifs (Voie B)** routés vers École Naturo + partenaires.

---

## ⚠️ À lire en premier : l'architecture SEO

Ce projet a **deux moteurs de rendu sur la même origine** :

1. **SPA React (Vite)** en **hash routing**, servie sur **`/app`** (`/app#/recherche`, `/app#/formation/:id`) → **NON indexable**. C'est l'interactif (recherche, facettes, formulaire de lead).
2. **Pages SSR Express** à **URLs propres et crawlables** (`/` accueil, `/formations/:categorie`, `/formation/:numero` fiches, `/metier/...`, `/ville/...`, `/blog/...`) → **c'est ICI que vit tout le SEO**. L'ancienne URL `/formations` est redirigée en 301 vers `/`.

> **Règle d'or :** le référencement repose **exclusivement** sur les pages SSR servies par Express. Ne migre jamais le SEO vers le React. Toute page qu'on veut voir dans Google doit être une route Express qui renvoie du HTML complet (title/meta/H1/JSON-LD), pas une vue SPA.

En prod, **un seul serveur Express** sert à la fois ces pages SSR **et** la SPA buildée (`dist/public`). Voir [src/server/index.ts](src/server/index.ts).

---

## Stack

- **Langage** : TypeScript, exécuté via `tsx` (pas de step de compilation pour le serveur).
- **Serveur** : Express ([src/server/index.ts](src/server/index.ts)) — API publique + admin + pages SEO SSR + sert la SPA.
- **Front** : React 18 + Vite 6 + Tailwind 3 + Wouter (routing client en **hash**).
- **DB** : SQLite via `better-sqlite3` (synchrone). **C'est aussi la DB de prod**, persistée sur un **volume Railway monté sur `/app/data`**.
- **ORM** : Drizzle — schéma en 3 fichiers : [src/db/schema.ts](src/db/schema.ts) (sqlite), [src/db/schema-mysql.ts](src/db/schema-mysql.ts), [src/db/schema-active.ts](src/db/schema-active.ts) (sélecteur).
- **Source de données** : API publique Opendatasoft Caisse des Dépôts (Mon Compte Formation / EDOF) — pas de clé requise.

## Commandes

```bash
npm install
npm run ingest        # télécharge + normalise + upsert le catalogue du pôle (~2 100 formations)
npm run enrich:villes # enrichit les villes des organismes (SIRENE) — long, optionnel
npm run db:stats      # stats de la base

# Dev = 2 terminaux :
npm run serve         # API Express + pages SEO SSR sur :3001
npm run web           # front Vite sur :5173 (proxy /api,/formations,/sitemap.xml,/robots.txt → :3001)

npm run build         # build la SPA dans dist/public
npx tsx scripts/generate-og-images.ts  # régénère les images OG de marque (public/images/og/)
npm start             # serveur de prod (sert SSR + SPA)
npm run check         # tsc --noEmit (typecheck, pas de build)
```

> Pour bosser le **SEO**, le terminal qui compte est `npm run serve` (port 3001) : c'est lui qui rend les pages crawlables. `npm run web` (5173) est utile pour l'interactif React.

## Carte du code (où travailler)

| Sujet | Fichier |
|---|---|
| **Pages SEO SSR** (le cœur du SEO) | [src/server/seo.ts](src/server/seo.ts) |
| robots.txt / sitemap.xml | [src/server/seo.ts](src/server/seo.ts) (`allIndexableUrls`) |
| **IndexNow** (ping Bing/Yandex) | [src/server/indexnow.ts](src/server/indexnow.ts) |
| Mesure d'audience GA4 (consentement) | [src/server/analytics.ts](src/server/analytics.ts) |
| Contenu éditorial — fiches métier | [content/metiers/*.json](content/metiers) (typé `Metier` dans [src/server/content.ts](src/server/content.ts)) |
| Contenu éditorial — articles blog | [content/blog/*.md](content/blog) (front-matter : `slug,title,metaDescription,excerpt,image`) |
| API publique + leads + admin | [src/server/routes.ts](src/server/routes.ts) |
| Requêtes SQL / recherche FTS5 | [src/server/storage.ts](src/server/storage.ts) |
| Email partenaire (Mailjet) | [src/server/mailer.ts](src/server/mailer.ts) |
| Ingestion catalogue | [src/ingest/](src/ingest) |
| Front React (design/UI interactif) | [src/client/](src/client) |
| Style des pages SSR | CSS inline dans `renderPage()` de [src/server/seo.ts](src/server/seo.ts) |

## Conventions SEO (à respecter quand on ajoute/édite une page)

- **Une route Express = une page indexable** avec `<title>` **unique**, `meta description` unique, **un seul H1**, `<link rel="canonical">`.
- **Canonical** : basé sur `PUBLIC_URL` en prod (sinon déduit de la requête). Toujours en absolu.
- **JSON-LD** : `BreadcrumbList` est ajouté automatiquement par `renderPage()`. Ajoute le schéma spécifique via `jsonLd: [...]` (`Course`/`ItemList`, `FAQPage`, `Article`).
- **Maillage interne** : chaque page tisse des liens (chips/cards) vers les pages sœurs (métier ↔ département ↔ ville). Ne crée pas de page orpheline.
- **Toute nouvelle URL indexable doit apparaître dans `allIndexableUrls()`** (sinon absente du sitemap **et** d'IndexNow).
- Contenu YMYL (santé/formation) : rester factuel, pas de promesses trompeuses, mentionner CPF/Qualiopi avec exactitude.

## Variables d'environnement

| Var | Rôle |
|---|---|
| `PORT` | port HTTP (injecté par Railway en prod ; 3001 en local) |
| `PUBLIC_URL` | **URL publique** pour canonical + sitemap (ex : `https://formation-sante-bienetre.fr`) — **à définir en prod** |
| `ADMIN_TOKEN` | token d'accès au back-office `/api/admin` (et `/#/admin`) |
| `INGEST_INTERVAL_HOURS` | re-ingestion in-process périodique (`0` = off) |
| `MAILJET_API_KEY` / `MAILJET_API_SECRET` / `MAIL_FROM` / `MAIL_FROM_NAME` | notif email partenaire à chaque lead (sinon log stub) |
| `INDEXNOW_KEY` / `INDEXNOW_HOST` | clé IndexNow (publique par design) + host |
| `GA4_MEASUREMENT_ID` | active GA4 + bandeau de consentement (vide = inerte : aucun bandeau, aucun cookie ; cf. [src/server/analytics.ts](src/server/analytics.ts)) |
| `DB_DRIVER` / `SQLITE_PATH` | driver DB + chemin SQLite |

Les **secrets ne sont jamais commités** (`.env` est gitignored). Les valeurs réelles vivent dans NordPass (coffre partagé du projet) et dans les variables Railway.

## Déploiement (Railway)

- Build Docker ([Dockerfile](Dockerfile)) → `CMD npx tsx src/server/index.ts`.
- **Auto-deploy** sur push de la branche `master` (GitHub → Railway).
- **Pas de `VOLUME` dans le Dockerfile** (Railway le rejette) : la persistance SQLite passe par un **Railway Volume monté sur `/app/data`** (configuré dans le dashboard).
- Au 1er boot sur volume neuf, l'app **auto-ingère** le catalogue (voir [src/server/index.ts](src/server/index.ts)).

## Pièges à éviter (gotchas)

- ❌ Ne pas migrer le SEO dans la SPA (hash routing = invisible pour Google).
- ❌ Ne pas ajouter de `VOLUME` au Dockerfile.
- ❌ Ne pas committer `.env`, `*.db`, `data/`.
- ⚠️ La DB SQLite **est** la prod : une migration de schéma doit rester compatible avec les données du volume.
- ⚠️ Après ajout d'URLs indexables, vérifier qu'elles sont dans `allIndexableUrls()` puis re-soumettre via IndexNow / sitemap.
- ⚠️ `npm run ingest` écrase/réconcilie le catalogue ; les fiches absentes du dernier extract passent `is_active=0` (pas supprimées).

## Pour aller plus loin

- Onboarding humain + accès : [ONBOARDING.md](ONBOARDING.md)
- Registre des accès (sans secrets) : [docs/ACCESS.md](docs/ACCESS.md)
- Historique des lots livrés : [README.md](README.md)
