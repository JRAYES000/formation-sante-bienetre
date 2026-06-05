// Enrichit les organismes avec leur ville via l'API publique « Recherche d'entreprises »
// (gratuite, sans clé). Cadencé pour respecter le débit. N'interroge que ceux sans ville,
// et marque les échecs (ville = '') pour ne jamais les ré-interroger.
import { sqlite } from "../db/index.ts";

const API = "https://recherche-entreprises.api.gouv.fr/search";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function villesAEnrichirCount(): number {
  return (sqlite.prepare(`SELECT count(*) n FROM organismes WHERE ville IS NULL`).get() as { n: number }).n;
}

export async function enrichVilles(
  onProgress?: (done: number, total: number) => void,
  max = 2000
): Promise<{ ok: number; vides: number }> {
  const rows = sqlite.prepare(`SELECT siret FROM organismes WHERE ville IS NULL LIMIT @max`).all({ max }) as {
    siret: string;
  }[];
  const upd = sqlite.prepare(`UPDATE organismes SET ville = @ville, code_postal = @cp WHERE siret = @siret`);
  let ok = 0;
  let vides = 0;
  for (let i = 0; i < rows.length; i++) {
    const siret = rows[i].siret;
    let ville = "";
    let cp = "";
    try {
      const res = await fetch(`${API}?q=${encodeURIComponent(siret)}&per_page=1`);
      if (res.ok) {
        const data: any = await res.json();
        const e = data.results?.[0];
        const etab = e?.matching_etablissements?.[0] ?? e?.siege;
        ville = etab?.libelle_commune ?? "";
        cp = etab?.code_postal ?? "";
      }
    } catch {
      /* réseau : on marque vide pour ne pas boucler */
    }
    upd.run({ siret, ville, cp });
    ville ? ok++ : vides++;
    onProgress?.(i + 1, rows.length);
    await sleep(140); // ~7 req/s
  }
  return { ok, vides };
}
