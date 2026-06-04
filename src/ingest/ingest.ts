// Logique d'ingestion réutilisable (CLI + cron). Pôle → normalise → upsert →
// désactive les fiches disparues → reconstruit l'index FTS5.
import { sql } from "drizzle-orm";
import { db, sqlite, ensureSchema } from "../db/index.ts";
import { organismes, formations, categories, formationDepartements } from "../db/schema.ts";
import { fetchPole, type OdsRecord } from "./fetch-pole.ts";

export interface IngestSummary {
  formations: number;
  organismes: number;
  categories: number;
  couples: number;
  aDistance: number;
  deactivated: number;
  durationMs: number;
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
function int(v: unknown): number | null {
  const n = num(v);
  return n === null ? null : Math.round(n);
}
function clean(v: unknown): string | null {
  const s = (v ?? "").toString().trim();
  return s === "" || s === "-1" ? null : s;
}

export async function ingestPole(
  onProgress?: (loaded: number, total: number) => void
): Promise<IngestSummary> {
  const t0 = Date.now();
  ensureSchema();
  const records = await fetchPole(onProgress);
  const now = new Date().toISOString();

  // 1) Catégories
  const labels = [...new Set(records.map((r) => clean(r.libelle_code_formacode_principal)).filter(Boolean))] as string[];
  for (const label of labels) {
    db.insert(categories).values({ formacodeLabel: label, nom: label, slug: slugify(label) }).onConflictDoNothing().run();
  }
  const catId = new Map((db.select().from(categories).all()).map((c) => [c.formacodeLabel, c.id]));

  // 2) Organismes (qualiopi = 1 : présence sur EDOF ⇒ Qualiopi obligatoire depuis 2022)
  const orgMap = new Map<string, OdsRecord>();
  for (const r of records) if (r.siret && !orgMap.has(r.siret)) orgMap.set(r.siret, r);
  db.transaction((tx) => {
    for (const r of orgMap.values()) {
      const vals = {
        siret: r.siret,
        nom: r.nom_of ?? "Organisme",
        departement: clean(r.nom_departement),
        codeDepartement: clean(r.code_departement),
        region: clean(r.nom_region),
        qualiopi: 1,
      };
      tx.insert(organismes)
        .values({ ...vals, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({ target: organismes.siret, set: { ...vals, updatedAt: now } })
        .run();
    }
  });

  // 3) Formations
  db.transaction((tx) => {
    for (const r of records) {
      if (!r.numero_formation || !r.siret) continue;
      const isRS = (r.type_referentiel ?? "").toUpperCase() === "RS";
      const v = {
        siret: r.siret,
        intitule: r.intitule_formation ?? r.intitule_certification ?? "Formation",
        intituleCertification: clean(r.intitule_certification),
        typeReferentiel: clean(r.type_referentiel),
        codeRncp: isRS ? null : clean(r.code_rncp),
        codeRs: isRS ? clean(r.code_inventaire) : null,
        formacodeLabel: clean(r.libelle_code_formacode_principal),
        categorieId: catId.get(clean(r.libelle_code_formacode_principal) ?? "") ?? null,
        niveau: clean(r.libelle_niveau_sortie_formation),
        heures: int(r.nombre_heures_total_mean),
        prixMin: num(r.frais_ttc_tot_min),
        prixMax: num(r.frais_ttc_tot_max),
        aDistance: (int(r.nb_session_a_distance) ?? 0) > 0 ? 1 : 0,
        nbSessions: int(r.nb_session_active),
        departement: clean(r.nom_departement),
        codeDepartement: clean(r.code_departement),
        objectif: clean(r.objectif_formation),
        contenu: clean(r.contenu_formation),
        pointsForts: clean(r.points_forts),
        dateExtract: clean(r.date_extract),
        isActive: 1 as const,
      };
      tx.insert(formations)
        .values({ numeroFormation: r.numero_formation, ...v, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({ target: formations.numeroFormation, set: { ...v, updatedAt: now } })
        .run();
    }
  });

  // 3b) Fiches disparues du dernier extract → désactivées (non touchées ce run)
  const deactivated = sqlite
    .prepare(`UPDATE formations SET is_active = 0 WHERE updated_at <> @now`)
    .run({ now }).changes;

  // 3c) Grain géo
  const fdSeen = new Set<string>();
  sqlite.exec("DELETE FROM formation_departements");
  db.transaction((tx) => {
    for (const r of records) {
      const code = clean(r.code_departement);
      if (!r.numero_formation || !code) continue;
      const key = `${r.numero_formation}|${code}`;
      if (fdSeen.has(key)) continue;
      fdSeen.add(key);
      tx.insert(formationDepartements)
        .values({ numeroFormation: r.numero_formation, codeDepartement: code, departement: clean(r.nom_departement), region: clean(r.nom_region) })
        .onConflictDoNothing()
        .run();
    }
  });

  // 3d) Index FTS5 (uniquement les fiches actives)
  sqlite.exec("DELETE FROM formations_fts");
  sqlite.exec(`
    INSERT INTO formations_fts (numero_formation, intitule, certification, organisme)
    SELECT f.numero_formation, f.intitule, COALESCE(f.intitule_certification, ''), o.nom
    FROM formations f JOIN organismes o ON o.siret = f.siret
    WHERE f.is_active = 1
  `);

  const one = (q: any) => (db.select({ n: sql<number>`count(*)` }).from(q).get()?.n ?? 0);
  return {
    formations: db.select({ n: sql<number>`count(*)` }).from(formations).where(sql`is_active = 1`).get()?.n ?? 0,
    organismes: one(organismes),
    categories: one(categories),
    couples: one(formationDepartements),
    aDistance: db.select({ n: sql<number>`count(*)` }).from(formations).where(sql`a_distance = 1 AND is_active = 1`).get()?.n ?? 0,
    deactivated,
    durationMs: Date.now() - t0,
  };
}
