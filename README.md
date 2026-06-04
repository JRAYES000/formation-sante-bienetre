# formation-sante-bienetre

Agrégateur de formations CPF — vertical **Santé / Bien-être / Social**.
Lancement sur le pôle **Beauté & bien-être** (esthétique, coiffure, massage bien-être…).
Modèle **Voie B** : leads captifs routés d'abord vers École Naturo + partenaires connus, puis revente tierce.

> Produit public **distinct** de `naturo-pro` (le SaaS praticien). Stack réutilisé : Express + Drizzle + Vite + React.

## Stack

- **Données** : API Opendatasoft Caisse des Dépôts (Mon Compte Formation / EDOF) — catalogue CPF certifiant.
- **DB dev** : SQLite (better-sqlite3, synchrone). DB prod : MySQL (plus tard, via `schema-active.ts`).
- **ORM** : Drizzle (schéma ×3 fichiers : `schema.ts` / `schema-mysql.ts` / `schema-active.ts`).

## Démarrage

```bash
cp .env.example .env
npm install
npm run ingest      # télécharge + normalise + upsert le pôle (~3 200 lignes → ~2 100 formations)
npm run db:stats    # stats de la base

# App (2 terminaux) :
npm run serve       # API Express sur :3001
npm run web         # front Vite sur :5173 (proxy /api → :3001)

## Déploiement production

1. Construire la SPA :

```bash
npm run build
```

2. Démarrer le serveur de production :

```bash
npm start
```

3. Ou enchaîner build + démarrage :

```bash
npm run start:prod
```

### Variables d'environnement essentielles

- `PORT` : port HTTP de l'API/serveur express (défaut `3001`)
- `ADMIN_TOKEN` : token pour accéder au back-office `/api/admin`
- `PUBLIC_URL` : URL publique du site pour les canonical et le sitemap
- `INGEST_INTERVAL_HOURS` : intervalle de re-ingestion automatique (0 = désactivé)
- `MAILJET_API_KEY`, `MAILJET_API_SECRET`, `MAIL_FROM` : configuration d'envoi d'email partenaire
- `DB_DRIVER`, `SQLITE_PATH` : si vous déployez en SQLite

> En production, le serveur Express sert à la fois les pages SEO SSR et la SPA construite depuis `dist/public`.
```

## État (Lot 1 ✅ · Lot 2 ✅)

- **~2 084 formations** / **577 organismes** / **16 catégories** / **2 931 couples formation×département**.
- Clés propres : `siret` (organismes), `numero_formation` (formations).
- Grain géo réel via `formation_departements` (multiplicité préservée → pages métier×dept).
- Recherche **FTS5** (unicode, sans accents) + facettes catégories/départements.
- API publique Express (`npm run dev`) :
  - `GET /api/public/formations?q=&categorie=&dept=&distance=&prixMax=&page=&pageSize=`
  - `GET /api/public/formations/:numero`
  - `GET /api/public/organismes/:siret`
  - `GET /api/public/categories` · `GET /api/public/departements`
  - `POST /api/public/leads` (consentement RGPD obligatoire) → routing Voie B
- **Lead capture + Voie B** : formulaire fiche formation, lead routé vers un partenaire (École Naturo = catch-all priorité haute).
- **Back-office** `/#/admin` (token `ADMIN_TOKEN`) : liste des leads + changement de statut.
- **SEO SSR** (pages crawlables à URLs propres, servies par Express) :
  - `/formations` (hub) · `/formations/:metier` · `/formations/:metier/:departement`
  - `/sitemap.xml` (517 URLs) · `/robots.txt`
  - `<title>`/meta/H1 uniques + JSON-LD (BreadcrumbList + ItemList/Course) + maillage interne.

> ⚠️ La SPA est en **hash routing** (non indexable) ; le SEO repose sur ces pages **SSR**. En prod, Express sert les pages SEO **et** la SPA (même origine).
- **Fraîcheur** : `ingestPole()` réutilisable (CLI `npm run ingest` + cron in-process si `INGEST_INTERVAL_HOURS>0`) ; les fiches absentes du dernier extract passent `is_active=0`.
- **Qualiopi** : badge sur cartes/fiche/SEO (présence sur EDOF ⇒ Qualiopi obligatoire ; vérif live QuiForme = enrichissement futur via token API Entreprise).
- **Email** : notification Mailjet (API HTTP, sans dépendance) au partenaire à chaque lead ; stub loggé si clés absentes.

> Géo *ville* (enrichissement SIRENE) = Lot post-MVP. Le delta au-delà de l'offset 10 000 (export) = L6.

## Feuille de route (lots)

- **L1** ✅ Scaffold + schéma + ingestion du pôle.
- **L2** ✅ Grain géo (formation_departements) + recherche FTS5 + facettes + endpoints `/api/public`.
- **L3** ✅ Front React/Vite/Tailwind/Wouter (accueil, résultats+facettes, fiche formation, fiche organisme).
- **L4** ✅ Lead form + consentement RGPD + routing Voie B (École Naturo) + back-office `/admin`.
- **L5** ✅ Pages SEO SSR métier × département + sitemap (517 URLs) + JSON-LD + maillage.
- **L6** ✅ Cron de fraîcheur (re-ingest + fiches mortes désactivées) + badge Qualiopi + email Mailjet au partenaire.
