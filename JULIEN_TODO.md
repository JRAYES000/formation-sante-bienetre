# TODO Julien — Actions post-déploiement

Ce fichier regroupe toutes les actions à effectuer par l'équipe après déploiement en production.
Elles ne nécessitent pas de code — elles sont soit manuelles dans des interfaces, soit des vérifications visuelles.

---

## 🔴 Priorité haute

### 1. Merger les Pull Requests ouvertes

Deux PR sont prêtes à merger vers `master` :

- **PR #4** — Challenge #1 : 23 actions SEO on-page (titles, schema, CLS, LCP, maillage, GEO)  
  → https://github.com/JRAYES000/formation-sante-bienetre/pull/4

- **PR #6** (cette PR) — Challenge #2 Pilier 3 : 3 articles blog  
  `top-5-formations-esthetique-2026.md`, `prix-formation-coiffure-2026.md`, `formation-prothesiste-ongulaire-a-distance-2026.md`

**Rappel :** le code de `master` (PR #5, commit `6ea204f`) n'a pas pu être testé en conditions réelles dans le sandbox de l'agence (better-sqlite3 ne compile pas, réseau bloqué). Ta propre vérification visuelle avant mise en ligne est indispensable. Guide de vérification : voir `Challenge 2/Pilier 4 - Note de changements etape 3.docx` et `Challenge 2/Pilier 5.C - Guide d'intégration.docx`.

---

### 2. Compléter `sameAs` dans `src/server/seo.ts` (ligne ~69)

Le bloc `sameAs` de l'Organisation est actuellement en commentaires (placeholders). Décommenter et remplir avec les vraies URLs :

```typescript
sameAs: [
  "https://www.instagram.com/VOTRE_COMPTE_INSTAGRAM",
  "https://www.facebook.com/VOTRE_PAGE_FACEBOOK",
  "https://www.tiktok.com/@VOTRE_COMPTE_TIKTOK",
  "https://www.linkedin.com/company/VOTRE_PAGE_LINKEDIN",
  "https://www.youtube.com/@VOTRE_CHAINE_YOUTUBE",
  "https://www.pinterest.fr/VOTRE_COMPTE_PINTEREST",
],
```

---

### 3. Accès GA4 → fermer l'Action #24

Partager l'accès Google Analytics 4 avec Marcel pour permettre la clôture de l'Action #24 du Challenge #1 (suivi trafic organique).

---

## 🟡 Priorité moyenne

### 4. Vérifier Cloudflare — aucun bot IA bloqué au WAF

Aller dans le dashboard Cloudflare → **Security → WAF → Custom Rules**.  
Vérifier qu'aucune règle ne bloque les user-agents des crawlers IA suivants :
- `GPTBot` (OpenAI / ChatGPT)
- `ClaudeBot` (Anthropic)
- `PerplexityBot` (Perplexity)
- `Google-Extended` (Google AI Overviews)
- `Applebot-Extended`

Ces bots sont autorisés dans le `robots.txt` du code (commit `5d7229e`). Si Cloudflare les bloque au niveau WAF, le robots.txt ne suffit pas.

---

### 5. Rich Results Test — valider les schemas JSON-LD

Après déploiement, tester les 4 types de pages sur https://search.google.com/test/rich-results :

| Page à tester | Schema attendu |
|---|---|
| `/blog/top-5-formations-esthetique-2026` | Article + FAQPage |
| `/formations/esthetique-soin-corporel` | ItemList + FAQPage |
| `/metier/massage-bien-etre` | FAQPage |
| `/formations/massage-bien-etre/rhone` | BreadcrumbList + Course |

Si erreur sur FAQPage : vérifier que l'extracteur Markdown fonctionne (format `**Question ?**` ou `### Question ?`).

---

### 6. Soumettre `/llms.txt` aux moteurs IA

Le fichier `/llms.txt` est en production depuis le commit `5dc32e4`. Pour maximiser la visibilité dans les IA :

- **Perplexity** : soumettre via https://www.perplexity.ai/hub/faq (section "Submit your site")
- **ChatGPT / OpenAI** : aucune soumission manuelle requise — GPTBot crawle automatiquement si autorisé dans robots.txt ✅

---

## 🟢 Priorité basse

### 7. Re-crawl Google Search Console

Dans GSC → Sitemaps → Ressoumettre `https://formation-sante-bienetre.fr/sitemap.xml` après déploiement.

Rappel : après la resoumission du 03/07/2026, Google a découvert **1 147 pages** (contre 517 avant le Challenge #1).

---

*Document généré le 05/07/2026 — Agence Claude Partners*
