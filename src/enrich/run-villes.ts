// CLI : enrichit les villes des organismes. Lancer : npm run enrich:villes
import { ensureSchema } from "../db/index.ts";
import { enrichVilles, villesAEnrichirCount } from "./villes.ts";

async function main() {
  ensureSchema(); // applique la migration code_postal si besoin
  const todo = villesAEnrichirCount();
  console.log(`Organismes à enrichir : ${todo}`);
  if (todo === 0) return;
  const s = await enrichVilles((d, t) => process.stdout.write(`\r  ${d}/${t}…`));
  console.log(`\n✅ ${s.ok} villes trouvées, ${s.vides} non résolues.`);
}

main().catch((e) => {
  console.error("\n❌", e);
  process.exit(1);
});
