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

> Géo *ville* (enrichissement SIRENE) = Lot post-MVP. Le delta au-delà de l'offset 10 000 (export) = L6.

## Feuille de route (lots)

- **L1** ✅ Scaffold + schéma + ingestion du pôle.
- **L2** ✅ Grain géo (formation_departements) + recherche FTS5 + facettes + endpoints `/api/public`.
- **L3** ✅ Front React/Vite/Tailwind/Wouter (accueil, résultats+facettes, fiche formation, fiche organisme).
- **L4** ✅ Lead form + consentement RGPD + routing Voie B (École Naturo) + back-office `/admin`.
- **L5** Pages SEO programmatiques métier × département + sitemap + JSON-LD.
- **L6** Cron de fraîcheur + enrichissement Qualiopi (API QuiForme).
