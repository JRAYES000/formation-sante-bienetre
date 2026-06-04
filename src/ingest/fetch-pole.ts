// Récupère toutes les fiches du pôle (NSF) depuis l'API Opendatasoft de la
// Caisse des Dépôts (Mon Compte Formation), par pagination de 100.
import "dotenv/config";

const BASE =
  process.env.ODS_BASE ??
  "https://opendata.caissedesdepots.fr/api/explore/v2.1/catalog/datasets/moncompteformation_catalogueformation";
const POLE_NSF =
  process.env.POLE_NSF ??
  "Coiffure, esthétique et autres spécialites de services aux personnes";

// Champs bruts utiles du dataset (cf. spike).
export interface OdsRecord {
  numero_formation: string;
  siret: string;
  nom_of: string;
  nom_departement?: string;
  code_departement?: string;
  nom_region?: string;
  intitule_formation?: string;
  intitule_certification?: string;
  type_referentiel?: string;
  code_rncp?: string;
  code_inventaire?: string;
  libelle_code_formacode_principal?: string;
  libelle_niveau_sortie_formation?: string;
  nombre_heures_total_mean?: string | number;
  frais_ttc_tot_min?: string | number;
  frais_ttc_tot_max?: string | number;
  nb_session_active?: string | number;
  nb_session_a_distance?: string | number;
  objectif_formation?: string;
  contenu_formation?: string;
  points_forts?: string;
  date_extract?: string;
}

const PAGE = 100;
const MAX_OFFSET = 9900; // limite Opendatasoft (offset + limit <= 10000)

export async function fetchPole(
  onProgress?: (loaded: number, total: number) => void
): Promise<OdsRecord[]> {
  const where = encodeURIComponent(`libelle_nsf_1 = "${POLE_NSF}"`);

  // 1) total
  const head = await getJson(`${BASE}/records?where=${where}&limit=1`);
  const total: number = head.total_count ?? 0;

  // 2) pagination
  const out: OdsRecord[] = [];
  for (let offset = 0; offset < total && offset <= MAX_OFFSET; offset += PAGE) {
    const url = `${BASE}/records?where=${where}&limit=${PAGE}&offset=${offset}`;
    const data = await getJson(url);
    for (const r of data.results ?? []) out.push(r as OdsRecord);
    onProgress?.(out.length, total);
  }

  if (total > MAX_OFFSET) {
    console.warn(
      `⚠️  ${total} fiches au total mais l'API plafonne l'offset à ${MAX_OFFSET}. ` +
        `${out.length} récupérées. (Passer à l'endpoint /exports pour le delta — TODO L6.)`
    );
  }
  return out;
}

async function getJson(url: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
      if (res.status === 429) {
        await sleep(800);
        continue;
      }
      throw new Error(`HTTP ${res.status} sur ${url}`);
    } catch (e) {
      if (i === retries - 1) throw e;
      await sleep(500);
    }
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
