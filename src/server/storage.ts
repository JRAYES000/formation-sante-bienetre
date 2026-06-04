// Couche d'accès aux données. Convention naturo-pro : TOUT passe par storage,
// aucune requête SQL dans les routes. FTS5 pour la recherche plein-texte.
import { sqlite } from "../db/index.ts";

export interface SearchParams {
  q?: string;
  categorie?: string; // slug
  dept?: string; // code département
  distance?: boolean; // uniquement à distance
  prixMax?: number; // budget max (€)
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

function buildFilters(p: SearchParams, opts: { skip?: "categorie" | "dept" } = {}): Filters {
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
  if (p.prixMax != null) {
    where.push("(f.prix_min IS NULL OR f.prix_min <= @prixMax)");
    params.prixMax = p.prixMax;
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
  const orderBy = params.fts ? "ORDER BY bm25(formations_fts)" : "ORDER BY f.nb_sessions DESC, f.intitule ASC";

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
              o.siret, o.nom AS organisme, o.departement AS organisme_dept
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

  return {
    total,
    page,
    pageSize,
    pages: Math.ceil(total / pageSize),
    items,
    facets: { categories: facetCategories, departements: facetDepartements },
  };
}

export function getFormation(numero: string) {
  const f = sqlite
    .prepare(
      `SELECT f.*, c.slug AS categorie_slug, c.nom AS categorie_nom,
              o.nom AS organisme, o.departement AS organisme_dept, o.region AS organisme_region
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
       HAVING n > 0`
    )
    .all() as { categorie: string; code: string; dept: string; n: number }[];
}

// ─────────────── Leads & Voie B ───────────────

export interface LeadInput {
  numeroFormation?: string;
  nom: string;
  email: string;
  tel?: string;
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
        (numero_formation, nom, email, tel, consentement_rgpd, consentement_at, statut, partenaire_id, created_at)
       VALUES (@numeroFormation, @nom, @email, @tel, 1, @now, 'nouveau', @partenaireId, @now)`
    )
    .run({
      numeroFormation: input.numeroFormation ?? null,
      nom: input.nom,
      email: input.email,
      tel: input.tel ?? null,
      now,
      partenaireId,
    });
  return { id: Number(res.lastInsertRowid), partenaireId };
}

export function listLeads() {
  return sqlite
    .prepare(
      `SELECT l.id, l.nom, l.email, l.tel, l.statut, l.created_at,
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

export function listPartenaires() {
  return sqlite.prepare(`SELECT * FROM partenaires ORDER BY priorite DESC, id ASC`).all();
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
