# Audit SEO — formation-sante-bienetre.fr (juillet 2026)

Audit réalisé sur le code (`src/server/seo.ts`, `src/server/index.ts`, `content/`) et sur les
données live du domaine (Ubersuggest, marché France). **Périmètre : tout sauf netlinking** —
aucune action d'acquisition de backlinks n'est proposée ici, conformément à la demande.

## État des lieux

| Indicateur (Ubersuggest, FR) | Valeur |
|---|---|
| Mots-clés organiques positionnés | **2** (`formation injection acide hyaluronique sans diplome` #16, `formation praticienne massage bien etre` #24) |
| Trafic organique estimé | ~2 visites/mois |
| Autorité de domaine | 1/100 |
| Backlinks / domaines référents | 0 / 0 |

Le site est jeune et quasi invisible : le levier n°1 n'est pas d'optimiser des positions
existantes mais de **rendre indexable et crédible ce qui existe déjà** (2 086 formations,
203 articles, ~6 fiches métier, pages villes/départements).

Ce qui est déjà bien en place : pages SSR propres avec title/meta/canonical uniques, un seul H1,
BreadcrumbList automatique, FAQPage/Course/Article JSON-LD, robots.txt + sitemap + IndexNow,
llms.txt, 404 SSR anti soft-404, noindex sur les pages fines (<3 formations), maillage
métier ↔ département ↔ ville. Le socle est sain — les actions ci-dessous corrigent les trous.

---

## Les actions, par priorité

### P0 — bloquants structurels

#### 1. Servir une vraie page d'accueil SSR sur `/`
La racine `/` tombe dans le fallback SPA (`app.get("*")` dans `src/server/index.ts:69`) : elle
renvoie le shell React avec un title générique, sans contenu HTML, sans canonical. Or la racine
est l'URL qui concentre naturellement l'autorité (saisie directe, mentions, citations IA, futurs
liens). Elle n'est même pas dans le sitemap.
- Rendre le hub (actuel `/formations`) directement sur `/`, avec canonical `https://…/`.
- 301 `/formations` → `/` (ou l'inverse, mais une seule URL d'accueil), mettre à jour
  `allIndexableUrls()`, le breadcrumb « Accueil » et `Organization.url`.
- Au passage : forcer au niveau Express les 301 `http→https` et `www→apex` (Ubersuggest voit
  des URLs indexées en `http://`), via `x-forwarded-proto` déjà lu pour HSTS.

#### 2. Créer les pages SSR `/formation/:id` (les 2 086 fiches)
Les fiches formation n'existent qu'en hash routing (`/#/formation/:id`) : invisibles pour Google,
et chaque carte SSR (`formationCards()` dans `seo.ts:445-449`) pointe vers un fragment — pour un
crawler c'est un lien vers `/`, donc **tout le maillage sortant des pages listes est perdu**.
C'est le plus gros gisement de longue traîne du site (intitulé + organisme + ville + prix).
- Route Express `/formation/:numero` : HTML complet, `Course` JSON-LD individuel (description,
  provider, offers, courseMode), liens vers la catégorie/ville/département parents.
- Remplacer les `href="/#/formation/…"` des cartes par `/formation/…` (la SPA reste utilisable
  pour la recherche interactive ; le formulaire de lead peut être intégré ou lié).
- Ajouter ces URLs à `allIndexableUrls()` (sitemap + IndexNow). Si 2 000+ URLs d'un coup
  inquiètent, commencer par les formations Qualiopi avec prix renseigné.
- Corollaire : dans `courseListLd()` (`seo.ts:571`), chaque item pourra enfin pointer vers sa
  propre URL au lieu de `url: canonical` répété 25 fois.

#### 3. Dater le contenu et fiabiliser le sitemap
**173 articles sur 203 n'ont ni `publishedAt` ni `updatedAt`** en front-matter : pas de
`datePublished` dans le JSON-LD Article, pas de date visible, et le sitemap
(`seo.ts:854-866`) émet `lastmod = date du jour` pour toutes ces URLs, **tous les jours**.
Un lastmod qui change quotidiennement sans modification réelle apprend à Google à l'ignorer.
- Ajouter `publishedAt` (et `updatedAt` si retouche) aux 173 articles.
- Dans le sitemap : ne plus émettre de `lastmod` du tout pour les URLs sans date réelle
  (préférable à une fausse date), et supprimer `changefreq`/`priority` si on veut simplifier
  (Google les ignore).
- Afficher la date sur les articles (déjà géré par le template quand la donnée existe).

### P1 — confiance et E-E-A-T (décisif en YMYL)

#### 4. Supprimer les badges d'urgence simulés
`urgencyBadge()` (`seo.ts:423-437`) génère « ⚡ 3 places disponibles », « 🔥 Très demandée »
à partir de l'index de la carte — des données inventées, sur un site YMYL (formation/santé),
en contradiction avec la règle du CLAUDE.md (« rester factuel, pas de promesses trompeuses »).
C'est exactement le type de signal « deceptive » que les Quality Raters de Google sont chargés
de repérer, et un risque juridique (pratique commerciale trompeuse).
- Remplacer par des signaux réels : badge Qualiopi, type de certification (RNCP/RS), « À
  distance », nombre d'organismes dans la ville.

#### 5. Construire l'entité et l'E-E-A-T
Le JSON-LD `Organization` est minimal (`sameAs: []`, url pointant `/formations`), les articles
sont signés « Formation Santé Bien-être » (Organization) sans auteur humain, et il n'existe
aucune page « À propos » indexable expliquant qui est derrière le site et d'où viennent les
données.
- Créer `/a-propos` (indexable) : qui édite le site (École de Naturopathie et Sophrologie),
  la méthodologie (données EDOF/Caisse des Dépôts, critères Qualiopi), comment le site se
  rémunère (transparence leads → confiance).
- Enrichir `Organization` : `sameAs` (LinkedIn, réseaux sociaux existants), `address`,
  `contactPoint`, `foundingDate` ; le publier sur toutes les pages (déjà le cas) avec `url`
  = racine.
- Signer les articles avec un auteur nommé (`Person` + bio courte + page auteur), au moins
  pour les contenus les plus sensibles (financement, salaires, réglementation).

#### 6. Google Search Console + Bing Webmaster Tools
IndexNow ne touche que Bing/Yandex ; rien dans le projet n'indique que la propriété Google est
vérifiée. Avec 2 mots-clés positionnés pour ~1 500 URLs potentielles, le suivi de couverture
d'indexation est la boucle de feedback indispensable.
- Vérifier la propriété (DNS ou balise), soumettre `sitemap.xml`, surveiller
  Couverture/Pages non indexées, demander l'indexation des hubs après chaque lot d'actions.
- Connecter GSC à un suivi hebdo (impressions/clics par répertoire : `/blog/`, `/ville/`,
  `/formations/`, `/metier/`).

### P2 — maillage, contenu, technique

#### 7. Réparer les liens internes perdus et paginer les hubs
- Sur `/metiers` (`seo.ts:1472-1477`), 6 tuiles sur 12 pointent vers `/#/recherche/…`
  (naturopathie, réflexologie, spa manager, aromathérapie…) : liens morts pour Google alors
  que des articles de blog ciblent déjà ces requêtes. Les faire pointer vers les articles/
  catégories SSR correspondants (ex. `/blog/formation-naturopathie-cpf`).
- Les hubs catégorie affichent 50 formations max (`pageSize: 50`) sans pagination : tant que
  l'action 2 n'est pas faite, des centaines de formations ne sont visibles nulle part.
  Ajouter une pagination SSR (`?page=2` avec canonical auto-référent) ou augmenter la taille.

#### 8. Performance / Core Web Vitals
- **Aucune compression HTTP** : pas de middleware `compression` dans Express et rien ne
  garantit que Railway compresse en edge. Les pages SSR embarquent ~15 ko de CSS inline —
  ajouter `compression()` (gzip/brotli) est une ligne.
- **Aucun Cache-Control** : `express.static(publicDir)` sans `maxAge`, pages SSR sans
  en-tête de cache. Mettre `maxAge: '30d', immutable` sur les assets buildés (hashés par
  Vite) et un `Cache-Control: public, max-age=300` raisonnable sur les pages SSR.
- **Images hotlinkées** Unsplash/Pexels pour les cartes villes et OG images : dépendance à
  des tiers, pas de WebP maîtrisé, pas de `width/height` (CLS), pas de `loading="lazy"`.
  Self-héberger dans `/images/` en WebP redimensionné.
- Self-héberger la police Plus Jakarta Sans (2 requêtes cross-origin render-impacting en
  moins, et supprime un point du CSP).

#### 9. Images de marque et OG dédiées
Toutes les pages partagent une poignée de photos stock Unsplash en `og:image` — sur un partage
ou dans Discover, toutes les pages du site ont la même vignette générique qu'un autre site
pourrait utiliser. Générer des OG images de marque par gabarit (catégorie, ville, article :
fond aux couleurs du site + titre), et ajouter des images illustratives avec `alt` descriptif
dans les articles (203 articles quasi sans images = faible éligibilité Google Images/Discover).

#### 10. Stabiliser les titles et le H1 d'accueil
- Le H1 du hub est codé en dur « 2 086 formations » (`seo.ts:913`) alors que le compte est
  dynamique — il divergera à la prochaine ingestion. Injecter `globalStats()`.
- Les titles de catégories embarquent le compte (« – 214 formations Qualiopi ») : chaque
  re-ingestion réécrit le title de toutes les pages (churn inutile). Garder le chiffre dans
  la description, pas dans le title.
- Le suffixe « | Formation Santé Bien-être » (29 caractères) tronque les titles longs ;
  l'abréger (« | FSB » n'a pas de valeur de marque encore — préférer des titles courts sans
  compteur : « Formation esthétique CPF : comparer les organismes Qualiopi »).

#### 11. Plan anti-cannibalisation du blog
203 articles à forte proximité sémantique (ex. `formation-esthetique-lyon-guide` vs
`/ville/lyon` vs `formation-coiffure-lyon` ; deux articles « financer sans CPF » quasi jumeaux
`financer-formation-beaute-sans-cpf` / `financer-formation-esthetique-sans-cpf`). À ce volume,
Google choisit lui-même l'URL et se trompe souvent.
- Construire un mapping « mot-clé principal → 1 URL cible » ; fusionner (301) les doublons ;
  différencier les intentions (article = guide/conseil, page ville = liste transactionnelle)
  et faire pointer chaque article local vers sa page `/ville/…` correspondante.

#### 12. Nettoyage schema.org
- `WebSite.potentialAction` (SearchAction) pointe `/formations?q=…` qui n'est pas une page de
  résultats : supprimer (la sitelinks searchbox est de toute façon retirée) ou implémenter.
- Une fois l'action 2 livrée, vérifier les fiches dans le test de résultats enrichis
  (Course exige name/description/provider — déjà couverts par `courseDescription()`).

---

## Ordre de mise en œuvre suggéré

| Semaine | Actions | Effet attendu |
|---|---|---|
| 1 | 1, 3, 4, 6, 10 | Indexation propre, sitemap crédible, home réelle, confiance |
| 2–3 | 2, 7 | +2 000 URLs longue traîne + maillage interne réparé |
| 3–4 | 5, 8 | E-E-A-T (YMYL) + Core Web Vitals |
| continu | 9, 11, 12 | Qualité éditoriale, consolidation, rich results |

Chaque nouvelle URL indexable doit passer par `allIndexableUrls()` puis re-soumission
sitemap/IndexNow (règle existante du projet).
