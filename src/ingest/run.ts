// Lot 1 — pipeline d'ingestion : fetch pôle → normalise → upsert.
// Lancer : npm run ingest
import { sql } from "drizzle-orm";
import { db, ensureSchema } from "../db/index.ts";
import { organismes, formations, categories } from "../db/schema.ts";
import { fetchPole, type OdsRecord } from "./fetch-pole.ts";

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

async function main() {
  const t0 = Date.now();
  ensureSchema();

  console.log("⏳ Récupération du pôle depuis l'API Opendatasoft (CDC)…");
  const records = await fetchPole((loaded, total) => {
    process.stdout.write(`\r   ${loaded}/${total} fiches…`);
  });
  console.log(`\n✅ ${records.length} fiches brutes récupérées.`);

  const now = new Date().toISOString();

  // 1) Catégories distinctes (Formacode principal) → upsert + map label→id
  const labels = [...new Set(records.map((r) => clean(r.libelle_code_formacode_principal)).filter(Boolean))] as string[];
  for (const label of labels) {
    db.insert(categories)
      .values({ formacodeLabel: label, nom: label, slug: slugify(label) })
      .onConflictDoNothing()
      .run();
  }
  const catRows = db.select().from(categories).all();
  const catId = new Map(catRows.map((c) => [c.formacodeLabel, c.id]));

  // 2) Organismes distincts (par SIRET)
  const orgMap = new Map<string, OdsRecord>();
  for (const r of records) if (r.siret && !orgMap.has(r.siret)) orgMap.set(r.siret, r);

  db.transaction((tx) => {
    for (const r of orgMap.values()) {
      tx.insert(organismes)
        .values({
          siret: r.siret,
          nom: r.nom_of ?? "Organisme",
          departement: clean(r.nom_departement),
          codeDepartement: clean(r.code_departement),
          region: clean(r.nom_region),
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: organismes.siret,
          set: {
            nom: r.nom_of ?? "Organisme",
            departement: clean(r.nom_departement),
            codeDepartement: clean(r.code_departement),
            region: clean(r.nom_region),
            updatedAt: now,
          },
        })
        .run();
    }
  });

  // 3) Formations (par numero_formation)
  let inserted = 0;
  db.transaction((tx) => {
    for (const r of records) {
      if (!r.numero_formation || !r.siret) continue;
      const isRS = (r.type_referentiel ?? "").toUpperCase() === "RS";
      tx.insert(formations)
        .values({
          numeroFormation: r.numero_formation,
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
          isActive: 1,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: formations.numeroFormation,
          set: {
            intitule: r.intitule_formation ?? r.intitule_certification ?? "Formation",
            prixMin: num(r.frais_ttc_tot_min),
            prixMax: num(r.frais_ttc_tot_max),
            aDistance: (int(r.nb_session_a_distance) ?? 0) > 0 ? 1 : 0,
            nbSessions: int(r.nb_session_active),
            dateExtract: clean(r.date_extract),
            isActive: 1,
            updatedAt: now,
          },
        })
        .run();
      inserted++;
    }
  });

  // 4) Résumé
  const cF = db.select({ n: sql<number>`count(*)` }).from(formations).get();
  const cO = db.select({ n: sql<number>`count(*)` }).from(organismes).get();
  const cC = db.select({ n: sql<number>`count(*)` }).from(categories).get();
  const cD = db.select({ n: sql<number>`count(*)` }).from(formations).where(sql`a_distance = 1`).get();

  console.log("\n──────── INGESTION TERMINÉE ────────");
  console.log(`Formations  : ${cF?.n}`);
  console.log(`Organismes  : ${cO?.n}`);
  console.log(`Catégories  : ${cC?.n}`);
  console.log(`Dont à distance : ${cD?.n}`);
  console.log(`Traitées    : ${inserted} en ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((e) => {
  console.error("\n❌ Échec ingestion :", e);
  process.exit(1);
});
