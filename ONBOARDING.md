# Onboarding — formation-sante-bienetre

Bienvenue 👋 Ce document te donne **tout ce qu'il faut pour être opérationnel** sur le site
[formation-sante-bienetre.fr](https://formation-sante-bienetre.fr) : développement, **SEO** et **design**.

> Ton Claude Code lira automatiquement [CLAUDE.md](CLAUDE.md) (contexte technique). Ce fichier-ci est l'**onboarding humain** : accès, setup, où travailler, priorités.
>
> 🚀 **Pressé ? Les étapes concrètes de démarrage (pas à pas) sont dans [docs/DEMARRAGE.md](docs/DEMARRAGE.md).**

---

## 1. Le projet en 30 secondes

Agrégateur de formations **CPF** sur le vertical **beauté & bien-être** (esthétique, massage, coiffure, soins).
Le site capte des **leads** (formulaire « Je m'informe ») routés en priorité vers **École Naturo** et des partenaires.
Le trafic vient du **SEO** : des centaines de pages métier × département × ville, générées côté serveur.

**Stack** : TypeScript · Express (pages SEO SSR + API) · React/Vite (interactif) · SQLite/Drizzle · hébergé sur **Railway**, domaine chez **Hostinger**.

⚠️ **Le point le plus important à comprendre** : le SEO **n'est pas dans le React**. Il est dans les pages **SSR Express** ([src/server/seo.ts](src/server/seo.ts)). La SPA est en hash routing, donc invisible pour Google. Détails dans [CLAUDE.md](CLAUDE.md).

---

## 2. Tes accès (ce que Julien te donne)

Tu as un **accès complet** (code + déploiement + infra). Voici les 6 briques et la manière dont l'accès t'est transmis. Coche au fur et à mesure :

- [ ] **GitHub** — repo `JRAYES000/formation-sante-bienetre`
  → invitation comme *collaborateur* (write). Accepte l'invite sur ton compte GitHub, puis `git clone`.
- [ ] **Railway** — projet *gallant-courage*, env *production* (hébergement, variables, logs, console, volume)
  → invitation comme *membre du projet*. Tu y vois les variables d'env de prod et les logs de déploiement.
- [ ] **Hostinger** — domaine + **DNS** de `formation-sante-bienetre.fr`
  → accès partagé (ou demande à Julien pour toute modif DNS ponctuelle).
- [ ] **Mailjet** — emails transactionnels (notif partenaire à chaque lead, email de bienvenue newsletter)
  → clés API dans le **coffre NordPass partagé**.
- [ ] **Back-office admin** — `/#/admin` (liste des leads, export CSV) via `ADMIN_TOKEN`
  → token dans le **coffre NordPass partagé**.
- [ ] **Google Search Console** — *(à mettre en place, voir §5)* indexation + requêtes/positions
  → tu seras ajouté comme *utilisateur* une fois la propriété vérifiée.

### Les secrets passent par NordPass

Tous les secrets (clés Mailjet, `ADMIN_TOKEN`, contenu du `.env` de prod, futures clés API) sont partagés via un **coffre NordPass dédié au projet**. **On ne s'échange jamais de secret en clair** (mail/WhatsApp/Slack). Le registre « qui a accès à quoi » (sans les valeurs) est dans [docs/ACCESS.md](docs/ACCESS.md).

---

## 3. Setup local (5 min)

```bash
git clone https://github.com/JRAYES000/formation-sante-bienetre.git
cd formation-sante-bienetre

cp .env.example .env       # puis renseigne les valeurs depuis NordPass
npm install
npm run ingest             # remplit la base SQLite locale (~2 100 formations)
npm run db:stats           # vérifie : formations / organismes / catégories

# Lance 2 terminaux :
npm run serve              # API + pages SEO SSR → http://localhost:3001/formations
npm run web                # front React → http://localhost:5173
```

Pages SEO à ouvrir en local pour comprendre : `http://localhost:3001/formations`, `/metiers`, `/villes`, `/blog`, `/sitemap.xml`, `/robots.txt`.

---

## 4. Où travailler

| Tu veux… | Va dans… |
|---|---|
| Ajouter/éditer une **page SEO** | [src/server/seo.ts](src/server/seo.ts) (+ ajouter l'URL à `allIndexableUrls()`) |
| Écrire un **article de blog** | nouveau `.md` dans [content/blog/](content/blog) (front-matter requis) |
| Enrichir une **fiche métier** | [content/metiers/*.json](content/metiers) |
| Retoucher le **design des pages SEO** | CSS inline de `renderPage()` dans [src/server/seo.ts](src/server/seo.ts) |
| Retoucher le **design de l'app interactive** | [src/client/](src/client) (React + Tailwind) |
| Toucher à la **recherche / aux données** | [src/server/storage.ts](src/server/storage.ts), [src/ingest/](src/ingest) |

Conventions SEO détaillées dans [CLAUDE.md](CLAUDE.md) (#Conventions SEO). Respecte-les : 1 page = 1 title/H1/canonical uniques + JSON-LD + maillage interne, et toute URL indexable doit être dans le sitemap.

---

## 5. Mesure SEO — état (déjà en place ✅)

- **Google Search Console** : ✅ propriété **domaine** `formation-sante-bienetre.fr` **vérifiée** (depuis le 4 juin 2026), Google **crawle déjà**. **Sitemap** `https://formation-sante-bienetre.fr/sitemap.xml` soumis et **valide (517 URLs, 0 erreur)**. Reste juste à t'**ajouter comme utilisateur** (Paramètres → Utilisateurs et autorisations).
- **Google Analytics 4** : ✅ installé avec **bandeau de consentement (CNIL)**. ID `G-3FBL0W6EXC` posé dans Railway (`GA4_MEASUREMENT_ID`). GA4 ne se charge qu'après « Accepter ». Voir [src/server/analytics.ts](src/server/analytics.ts).
- **Bing Webmaster Tools** : à faire — « Importer depuis GSC » en 1 clic (l'IndexNow est déjà branché côté code, [src/server/indexnow.ts](src/server/indexnow.ts)).

> Le site est **récent** (≈ 0 clic pour l'instant) : la phase actuelle est l'**indexation + la montée en contenu**, pas le diagnostic d'un trafic existant. À surveiller dans GSC : *Pages* (URLs indexées vs découvertes) et *Performances* (premières impressions/requêtes).

---

## 6. Workflow de contribution

- Branche par sujet (`feat/...`, `fix/...`, `seo/...`), PR vers `master`.
- ⚠️ Un **push sur `master` auto-déploie en prod** (Railway). Pas de commit direct sur `master` pour des changements non triviaux : passe par une PR.
- Avant de pousser : `npm run check` (typecheck) et vérifier les pages SSR en local.
- Commits en français, atomiques (cf. historique : `feat(seo): ...`, `feat(admin): ...`).

---

## 7. Bonus : MCP utiles pour Claude

Pour piloter l'infra directement depuis Claude Desktop/Code, des serveurs MCP existent (Google Search Console, Hostinger DNS, etc.). Si Julien te partage ses configs MCP (elles contiennent des secrets → via NordPass), ton agent pourra lire les perfs GSC, gérer le DNS, etc. Sinon, l'accès web classique à chaque brique suffit pour démarrer.

---

Des questions ? Tout le contexte technique est dans [CLAUDE.md](CLAUDE.md) et l'historique des lots dans [README.md](README.md).
