// CLI d'ingestion. Lancer : npm run ingest
import { ingestPole } from "./ingest.ts";

async function main() {
  console.log("⏳ Ingestion du pôle depuis l'API Opendatasoft (CDC)…");
  const s = await ingestPole((loaded, total) => process.stdout.write(`\r   ${loaded}/${total} fiches…`));
  console.log("\n──────── INGESTION TERMINÉE ────────");
  console.log(`Formations actives      : ${s.formations}`);
  console.log(`Organismes              : ${s.organismes}`);
  console.log(`Catégories              : ${s.categories}`);
  console.log(`Couples formation×dept  : ${s.couples}`);
  console.log(`Dont à distance         : ${s.aDistance}`);
  console.log(`Fiches désactivées      : ${s.deactivated}`);
  console.log(`Durée                   : ${(s.durationMs / 1000).toFixed(1)}s`);
}

main().catch((e) => {
  console.error("\n❌ Échec ingestion :", e);
  process.exit(1);
});
