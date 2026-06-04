// Bootstrap Express. En dev : npm run dev (tsx watch). Sert l'API publique.
import "dotenv/config";
import express from "express";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureSchema } from "../db/index.ts";
import { seedPartenaires, countFormations } from "./storage.ts";
import { publicRouter, adminRouter } from "./routes.ts";
import { seoRouter } from "./seo.ts";
import { ingestPole } from "../ingest/ingest.ts";

ensureSchema();
seedPartenaires();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const publicDir = resolve(__dirname, "../../dist/public");

app.use(express.json());
app.use(express.static(publicDir));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/public", publicRouter);
app.use("/api/admin", adminRouter);

// Pages SEO rendues côté serveur (URLs propres crawlables) + sitemap/robots
app.use("/", seoRouter);

// SPA fallback pour les routes client (hash routing)
app.get("*", (_req, res) => res.sendFile(resolve(publicDir, "index.html")));

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`▶ API formation-sante-bienetre sur http://localhost:${port}`);
  console.log(`  ex: http://localhost:${port}/api/public/formations?q=massage&dept=75`);

  // Auto-amorçage : si la base est vide (1er boot sur volume neuf), on ingère.
  if (countFormations() === 0) {
    console.log("📦 Base vide → ingestion initiale du pôle…");
    ingestPole()
      .then((s) => console.log(`✅ Ingestion initiale : ${s.formations} formations.`))
      .catch((e) => console.error("❌ Ingestion initiale échouée :", e));
  }
});

// Cron de fraîcheur in-process (optionnel) : INGEST_INTERVAL_HOURS=24 → re-ingestion périodique.
const intervalH = Number(process.env.INGEST_INTERVAL_HOURS ?? 0);
if (intervalH > 0) {
  const run = async () => {
    try {
      const s = await ingestPole();
      console.log(
        `🔄 Re-ingestion : ${s.formations} actives, ${s.deactivated} désactivées (${(s.durationMs / 1000).toFixed(1)}s)`
      );
    } catch (e) {
      console.error("🔄 Échec re-ingestion :", e);
    }
  };
  console.log(`🔄 Cron de fraîcheur actif : toutes les ${intervalH} h`);
  setInterval(run, intervalH * 3600_000);
}
