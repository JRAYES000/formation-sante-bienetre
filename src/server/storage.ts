// Couche d'accès aux données. Convention naturo-pro : TOUT passe par storage,
// aucune requête SQL dans les routes. FTS5 pour la recherche plein-texte.
import { sqlite } from "../db/index.ts";

export interface SearchParams {
  q?: string;
  categorie?: string; // slug
  dept?: string; // code département
  distance?: boolean; // uniquement à distance
  prixMin?: number; // budget min (€)
  prixMax?: number; // budget max (€)
  niveau?: string; // libellé niveau de sortie
  type?: string; // type de référentiel (RNCP / RS)
  sort?: "pertinence" | "prix_asc" | "prix_desc";
  page?: number;
  pageSize?: number;
}

// Construit une requête FTS5 sûre : chaque terme devient un préfixe quoté.
function ftsQuery(q: string): string | null {
  const terms = (q.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((t) => t.length >= 2);
  if (!terms.length) return null;
  return terms.map((t) => `"${t}"*`).join(" ");
}

interface Filters {
  joins: string[];
  where: string[];
  params: Record<string, unknown>;
}

function buildFilters(p: SearchParams, opts: { skip?: "categorie" | "dept" | "niveau" | "type" } = {}): Filters {
  const joins: string[] = [];
  const where: string[] = ["f.is_active = 1"];
  const params: Record<string, unknown> = {};

  const fts = p.q ? ftsQuery(p.q) : null;
  if (fts) {
    joins.push("JOIN formations_fts ON formations_fts.numero_formation = f.numero_formation AND formations_fts MATCH @fts");
    params.fts = fts;
  }
  if (p.categorie && opts.skip !== "categorie") {
    where.push("c.slug = @categorie");
    params.categorie = p.categorie;
  }
  if (p.dept && opts.skip !== "dept") {
    where.push(
      "EXISTS (SELECT 1 FROM formation_departements fd WHERE fd.numero_formation = f.numero_formation AND fd.code_departement = @dept)"
    );
    params.dept = p.dept;
  }
  if (p.distance) where.push("f.a_distance = 1");
  if (p.prixMin != null) {
    where.push("(f.prix_min IS NOT NULL AND f.prix_min >= @prixMin)");
    params.prixMin = p.prixMin;
  }
  if (p.prixMax != null) {
    where.push("(f.prix_min IS NULL OR f.prix_min <= @prixMax)");
    params.prixMax = p.prixMax;
  }
  if (p.niveau && opts.skip !== "niveau") {
    where.push("f.niveau = @niveau");
    params.niveau = p.niveau;
  }
  if (p.type && opts.skip !== "type") {
    where.push("f.type_referentiel = @type");
    params.type = p.type;
  }
  return { joins, where, params };
}

export function searchFormations(p: SearchParams) {
  const page = Math.max(1, p.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, p.pageSize ?? 20));
  const offset = (page - 1) * pageSize;
  const { joins, where, params } = buildFilters(p);
  const j = joins.join("\n");
  const w = where.join(" AND ");
  let orderBy: string;
  if (p.sort === "prix_asc") orderBy = "ORDER BY f.prix_min IS NULL, f.prix_min ASC, f.nb_sessions DESC";
  else if (p.sort === "prix_desc") orderBy = "ORDER BY f.prix_min DESC, f.nb_sessions DESC";
  else orderBy = params.fts ? "ORDER BY bm25(formations_fts)" : "ORDER BY f.nb_sessions DESC, f.intitule ASC";

  const total = (
    sqlite
      .prepare(
        `SELECT count(*) n FROM formations f
         JOIN organismes o ON o.siret = f.siret
         LEFT JOIN categories c ON c.id = f.categorie_id
         ${j} WHERE ${w}`
      )
      .get(params) as { n: number }
  ).n;

  const items = sqlite
    .prepare(
      `SELECT f.numero_formation, f.intitule, f.intitule_certification, f.type_referentiel,
              f.niveau, f.heures, f.prix_min, f.prix_max, f.a_distance, f.nb_sessions,
              c.slug AS categorie_slug, c.nom AS categorie_nom,
              o.siret, o.nom AS organisme, o.departement AS organisme_dept, o.ville AS organisme_ville, o.qualiopi AS organisme_qualiopi
       FROM formations f
       JOIN organismes o ON o.siret = f.siret
       LEFT JOIN categories c ON c.id = f.categorie_id
       ${j} WHERE ${w}
       ${orderBy} LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit: pageSize, offset });

  // Facettes (chacune ignore son propre filtre)
  const fc = buildFilters(p, { skip: "categorie" });
  const facetCategories = sqlite
    .prepare(
      `SELECT c.slug, c.nom, count(*) n FROM formations f
       JOIN organismes o ON o.siret = f.siret
       JOIN categories c ON c.id = f.categorie_id
       ${fc.joins.join("\n")} WHERE ${fc.where.join(" AND ")}
       GROUP BY c.id ORDER BY n DESC`
    )
    .all(fc.params);

  const fd = buildFilters(p, { skip: "dept" });
  const facetDepartements = sqlite
    .prepare(
      `SELECT fdp.code_departement code, fdp.departement nom, count(DISTINCT f.numero_formation) n
       FROM formations f
       JOIN organismes o ON o.siret = f.siret
       LEFT JOIN categories c ON c.id = f.categorie_id
       JOIN formation_departements fdp ON fdp.numero_formation = f.numero_formation
       ${fd.joins.join("\n")} WHERE ${fd.where.join(" AND ")}
       GROUP BY fdp.code_departement ORDER BY n DESC LIMIT 30`
    )
    .all(fd.params);

  const fn = buildFilters(p, { skip: "niveau" });
  const facetNiveaux = sqlite
    .prepare(
      `SELECT f.niveau nom, count(*) n FROM formations f
       JOIN organismes o ON o.siret = f.siret
       LEFT JOIN categories c ON c.id = f.categorie_id
       ${fn.joins.join("\n")} WHERE ${fn.where.join(" AND ")} AND f.niveau IS NOT NULL
       GROUP BY f.niveau ORDER BY n DESC LIMIT 12`
    )
    .all(fn.params);

  const ft = buildFilters(p, { skip: "type" });
  const facetTypes = sqlite
    .prepare(
      `SELECT f.type_referentiel nom, count(*) n FROM formations f
       JOIN organismes o ON o.siret = f.siret
       LEFT JOIN categories c ON c.id = f.categorie_id
       ${ft.joins.join("\n")} WHERE ${ft.where.join(" AND ")} AND f.type_referentiel IS NOT NULL
       GROUP BY f.type_referentiel ORDER BY n DESC`
    )
    .all(ft.params);

  return {
    total,
    page,
    pageSize,
    pages: Math.ceil(total / pageSize),
    items,
    facets: {
      categories: facetCategories,
      departements: facetDepartements,
      niveaux: facetNiveaux,
      types: facetTypes,
    },
  };
}

// Formations similaires (même catégorie, hors elle-même) — engagement + maillage SEO.
export function similarFormations(numero: string, limit = 6) {
  const row = sqlite
    .prepare(`SELECT categorie_id FROM formations WHERE numero_formation = @n`)
    .get({ n: numero }) as { categorie_id: number | null } | undefined;
  if (!row || row.categorie_id == null) return [];
  return sqlite
    .prepare(
      `SELECT f.numero_formation, f.intitule, f.prix_min, f.prix_max, f.a_distance, f.type_referentiel,
              c.slug AS categorie_slug, c.nom AS categorie_nom,
              o.nom AS organisme, o.qualiopi AS organisme_qualiopi
       FROM formations f
       JOIN organismes o ON o.siret = f.siret
       LEFT JOIN categories c ON c.id = f.categorie_id
       WHERE f.is_active = 1 AND f.categorie_id = @cat AND f.numero_formation <> @n
       ORDER BY f.nb_sessions DESC, f.intitule ASC LIMIT @limit`
    )
    .all({ cat: row.categorie_id, n: numero, limit });
}

// Statistiques globales pour le bandeau de confiance.
export function globalStats() {
  const one = (sql: string) => (sqlite.prepare(sql).get() as { n: number }).n;
  return {
    formations: one(`SELECT count(*) n FROM formations WHERE is_active = 1`),
    organismes: one(`SELECT count(DISTINCT siret) n FROM formations WHERE is_active = 1`),
    categories: one(`SELECT count(*) n FROM categories`),
    qualiopi: one(`SELECT count(*) n FROM organismes WHERE qualiopi = 1`),
  };
}

export function getFormation(numero: string) {
  const f = sqlite
    .prepare(
      `SELECT f.*, c.slug AS categorie_slug, c.nom AS categorie_nom,
              o.nom AS organisme, o.departement AS organisme_dept, o.region AS organisme_region,
              o.qualiopi AS organisme_qualiopi
       FROM formations f
       JOIN organismes o ON o.siret = f.siret
       LEFT JOIN categories c ON c.id = f.categorie_id
       WHERE f.numero_formation = @numero AND f.is_active = 1`
    )
    .get({ numero });
  if (!f) return null;
  const departements = sqlite
    .prepare(
      `SELECT code_departement code, departement nom, region
       FROM formation_departements WHERE numero_formation = @numero ORDER BY departement`
    )
    .all({ numero });
  return { ...f, departements };
}

export function getOrganisme(siret: string) {
  const o = sqlite.prepare(`SELECT * FROM organismes WHERE siret = @siret`).get({ siret });
  if (!o) return null;
  const formations = sqlite
    .prepare(
      `SELECT f.numero_formation, f.intitule, f.prix_min, f.prix_max, f.a_distance,
              c.slug AS categorie_slug, c.nom AS categorie_nom
       FROM formations f LEFT JOIN categories c ON c.id = f.categorie_id
       WHERE f.siret = @siret AND f.is_active = 1 ORDER BY f.intitule`
    )
    .all({ siret });
  return { ...o, formations };
}

export function listCategories() {
  return sqlite
    .prepare(
      `SELECT c.slug, c.nom, count(f.numero_formation) n
       FROM categories c LEFT JOIN formations f ON f.categorie_id = c.id AND f.is_active = 1
       GROUP BY c.id ORDER BY n DESC`
    )
    .all();
}

export function listDepartements() {
  return sqlite
    .prepare(
      `SELECT fd.code_departement code, fd.departement nom, count(DISTINCT fd.numero_formation) n
       FROM formation_departements fd
       JOIN formations f ON f.numero_formation = fd.numero_formation AND f.is_active = 1
       GROUP BY fd.code_departement ORDER BY n DESC`
    )
    .all();
}

// ─────────────── SEO (pages programmatiques) ───────────────

export function slugify(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export interface SeoDept {
  code: string;
  nom: string;
  slug: string;
  n: number;
}

export function seoDepartements(): SeoDept[] {
  return (listDepartements() as { code: string; nom: string | null; n: number }[]).map((d) => ({
    code: d.code,
    nom: d.nom ?? d.code,
    slug: slugify(d.nom ?? d.code),
    n: d.n,
  }));
}

// Couples (catégorie × département) existants → pour le sitemap et la validation des routes.
export function seoCombos(): { categorie: string; code: string; dept: string; n: number }[] {
  return sqlite
    .prepare(
      `SELECT c.slug AS categorie, fd.code_departement AS code, fd.departement AS dept,
              count(DISTINCT f.numero_formation) AS n
       FROM formations f
       JOIN categories c ON c.id = f.categorie_id
       JOIN formation_departements fd ON fd.numero_formation = f.numero_formation
       WHERE f.is_active = 1 AND fd.departement IS NOT NULL
       GROUP BY c.slug, fd.code_departement
       HAVING n >= 3`
    )
    .all() as { categorie: string; code: string; dept: string; n: number }[];
}

// Villes (ville du siège des organismes) ayant assez de formations pour une page dédiée.
export function seoVilles(min = 3): { ville: string; slug: string; n: number }[] {
  return (
    sqlite
      .prepare(
        `SELECT o.ville ville, count(DISTINCT f.numero_formation) n
         FROM formations f JOIN organismes o ON o.siret = f.siret
         WHERE f.is_active = 1 AND o.ville IS NOT NULL AND o.ville <> ''
         GROUP BY o.ville HAVING n >= @min ORDER BY n DESC`
      )
      .all({ min }) as { ville: string; n: number }[]
  ).map((r) => ({ ville: r.ville, slug: slugify(r.ville), n: r.n }));
}

export function seoVilleCombos(min = 3): { categorie: string; ville: string; n: number }[] {
  return sqlite
    .prepare(
      `SELECT c.slug categorie, o.ville ville, count(DISTINCT f.numero_formation) n
       FROM formations f JOIN organismes o ON o.siret = f.siret JOIN categories c ON c.id = f.categorie_id
       WHERE f.is_active = 1 AND o.ville IS NOT NULL AND o.ville <> ''
       GROUP BY c.slug, o.ville HAVING n >= @min`
    )
    .all({ min }) as { categorie: string; ville: string; n: number }[];
}

export function formationsForVille(ville: string, categorieSlug?: string) {
  const where = ["f.is_active = 1", "o.ville = @ville"];
  const params: Record<string, unknown> = { ville };
  if (categorieSlug) {
    where.push("c.slug = @cat");
    params.cat = categorieSlug;
  }
  return sqlite
    .prepare(
      `SELECT f.numero_formation, f.intitule, f.intitule_certification, f.type_referentiel, f.niveau,
              f.heures, f.prix_min, f.prix_max, f.a_distance,
              c.slug categorie_slug, c.nom categorie_nom,
              o.siret, o.nom organisme, o.qualiopi organisme_qualiopi
       FROM formations f JOIN organismes o ON o.siret = f.siret LEFT JOIN categories c ON c.id = f.categorie_id
       WHERE ${where.join(" AND ")} ORDER BY f.nb_sessions DESC, f.intitule LIMIT 60`
    )
    .all(params);
}

// ─────────────── Leads & Voie B ───────────────

export interface LeadInput {
  numeroFormation?: string;
  nom: string;
  email: string;
  tel?: string;
  qualification?: Record<string, string>; // budget, delai, financement, niveau
}

// Routage Voie B : choisit le partenaire (École Naturo par défaut = catch-all priorité haute).
function routePartenaire(numeroFormation?: string): number | null {
  let slug = "";
  if (numeroFormation) {
    const f = sqlite
      .prepare(
        `SELECT c.slug FROM formations f LEFT JOIN categories c ON c.id = f.categorie_id
         WHERE f.numero_formation = @n`
      )
      .get({ n: numeroFormation }) as { slug?: string } | undefined;
    slug = f?.slug ?? "";
  }
  const p = sqlite
    .prepare(
      `SELECT id FROM partenaires
       WHERE actif = 1 AND (categories_slugs IS NULL OR categories_slugs LIKE '%' || @slug || '%')
       ORDER BY priorite DESC, id ASC LIMIT 1`
    )
    .get({ slug }) as { id: number } | undefined;
  return p?.id ?? null;
}

export function createLead(input: LeadInput): { id: number; partenaireId: number | null } {
  const now = new Date().toISOString();
  const partenaireId = routePartenaire(input.numeroFormation);
  const res = sqlite
    .prepare(
      `INSERT INTO leads
        (numero_formation, nom, email, tel, consentement_rgpd, consentement_at, statut, partenaire_id, qualification, created_at)
       VALUES (@numeroFormation, @nom, @email, @tel, 1, @now, 'nouveau', @partenaireId, @qualification, @now)`
    )
    .run({
      numeroFormation: input.numeroFormation ?? null,
      nom: input.nom,
      email: input.email,
      tel: input.tel ?? null,
      now,
      partenaireId,
      qualification: input.qualification ? JSON.stringify(input.qualification) : null,
    });
  return { id: Number(res.lastInsertRowid), partenaireId };
}

export function listLeads() {
  return sqlite
    .prepare(
      `SELECT l.id, l.nom, l.email, l.tel, l.statut, l.created_at, l.qualification,
              l.numero_formation, f.intitule AS formation,
              p.nom AS partenaire
       FROM leads l
       LEFT JOIN formations f ON f.numero_formation = l.numero_formation
       LEFT JOIN partenaires p ON p.id = l.partenaire_id
       ORDER BY l.created_at DESC LIMIT 500`
    )
    .all();
}

export function updateLeadStatut(id: number, statut: string): number {
  return sqlite.prepare(`UPDATE leads SET statut = @statut WHERE id = @id`).run({ id, statut }).changes;
}

export function deleteLead(id: number): number {
  return sqlite.prepare(`DELETE FROM leads WHERE id = @id`).run({ id }).changes;
}

export function listPartenaires() {
  return sqlite.prepare(`SELECT * FROM partenaires ORDER BY priorite DESC, id ASC`).all();
}

// ─────────────── Avis organismes ───────────────

export function createAvis(input: { siret: string; note: number; auteur?: string; commentaire?: string }): number {
  const res = sqlite
    .prepare(
      `INSERT INTO avis (siret, note, auteur, commentaire, statut, created_at)
       VALUES (@siret, @note, @auteur, @commentaire, 'en_attente', @now)`
    )
    .run({
      siret: input.siret,
      note: Math.max(1, Math.min(5, Math.round(input.note))),
      auteur: input.auteur ?? null,
      commentaire: input.commentaire ?? null,
      now: new Date().toISOString(),
    });
  return Number(res.lastInsertRowid);
}

export function avisForOrganisme(siret: string) {
  const items = sqlite
    .prepare(`SELECT id, note, auteur, commentaire, created_at FROM avis WHERE siret = @siret AND statut = 'publie' ORDER BY created_at DESC LIMIT 50`)
    .all({ siret });
  const agg = sqlite
    .prepare(`SELECT count(*) n, avg(note) moy FROM avis WHERE siret = @siret AND statut = 'publie'`)
    .get({ siret }) as { n: number; moy: number | null };
  return { note: agg.moy ? Math.round(agg.moy * 10) / 10 : null, count: agg.n, items };
}

export function listAvisAdmin() {
  return sqlite.prepare(`SELECT * FROM avis ORDER BY (statut = 'en_attente') DESC, created_at DESC LIMIT 500`).all();
}

export function moderateAvis(id: number, statut: "publie" | "rejete"): number {
  return sqlite.prepare(`UPDATE avis SET statut = @statut WHERE id = @id`).run({ id, statut }).changes;
}

// Retourne true si l'email vient d'être ajouté (false si déjà inscrit) → permet
// de n'envoyer l'email de bienvenue que pour une vraie nouvelle inscription.
export function subscribeNewsletter(email: string): boolean {
  const res = sqlite
    .prepare(`INSERT INTO newsletter (email, created_at) VALUES (@email, @now) ON CONFLICT(email) DO NOTHING`)
    .run({ email: email.toLowerCase().trim(), now: new Date().toISOString() });
  return res.changes > 0;
}

// Liste des inscrits newsletter (back-office). Les plus récents d'abord.
export function listNewsletter() {
  return sqlite
    .prepare(`SELECT email, created_at FROM newsletter ORDER BY created_at DESC LIMIT 5000`)
    .all() as { email: string; created_at: string }[];
}

export function getPartenaireById(id: number) {
  return sqlite.prepare(`SELECT * FROM partenaires WHERE id = @id`).get({ id }) as
    | { id: number; nom: string; email: string }
    | undefined;
}

export function countFormations(): number {
  return (sqlite.prepare(`SELECT count(*) AS n FROM formations`).get() as { n: number }).n;
}

export function getFormationIntitule(numero: string): string | null {
  const r = sqlite.prepare(`SELECT intitule FROM formations WHERE numero_formation = @n`).get({ n: numero }) as
    | { intitule: string }
    | undefined;
  return r?.intitule ?? null;
}

// Seed Voie B : École Naturo seule au départ, catch-all (categories_slugs = NULL).
export function seedPartenaires(): void {
  const n = (sqlite.prepare(`SELECT count(*) n FROM partenaires`).get() as { n: number }).n;
  if (n > 0) return;
  sqlite
    .prepare(
      `INSERT INTO partenaires (nom, email, categories_slugs, priorite, actif, created_at)
       VALUES ('École Naturo', 'contact@ecole-naturo.fr', NULL, 100, 1, @now)`
    )
    .run({ now: new Date().toISOString() });
}
