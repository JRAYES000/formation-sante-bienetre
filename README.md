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
```

## État (Lot 1 ✅)

Pipeline d'ingestion opérationnel :
- **~2 084 formations** / **577 organismes** / **16 catégories** (métiers Formacode).
- Clés propres : `siret` (organismes), `numero_formation` (formations).
- Catégories dérivées du Formacode principal (slug SEO-ready).

## ⚠️ Réserve de modélisation à traiter en Lot 2 (grain géographique)

Le dataset a un grain **(formation × département)** : 3 252 lignes brutes → 2 084 formations distinctes.
Une même formation est proposée dans plusieurs départements. Le modèle actuel garde **un seul
département par formation** (collision sur `numero_formation`), ce qui **perd la multiplicité géo**.

➡️ **Lot 2, tâche n°1** : table `formation_departements (numero_formation, code_departement, departement)`
pour alimenter les pages SEO **métier × département** (le cœur de l'angle local). La géo *ville* viendra
via enrichissement SIRENE (Lot post-MVP).

## Feuille de route (lots)

- **L1** ✅ Scaffold + schéma + ingestion du pôle.
- **L2** Grain géo (formation_departements) + recherche FTS5 + facettes + endpoints `/api/public`.
- **L3** Front (accueil, résultats, fiche formation, fiche organisme).
- **L4** Lead form + consentement RGPD + routing Voie B + back-office.
- **L5** Pages SEO programmatiques métier × département + sitemap + JSON-LD.
- **L6** Cron de fraîcheur + enrichissement Qualiopi (API QuiForme).
