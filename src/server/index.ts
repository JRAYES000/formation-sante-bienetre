// Bootstrap Express. En dev : npm run dev (tsx watch). Sert l'API publique.
import "dotenv/config";
import express from "express";
import { ensureSchema } from "../db/index.ts";
import { seedPartenaires } from "./storage.ts";
import { publicRouter, adminRouter } from "./routes.ts";
import { seoRouter } from "./seo.ts";
import { ingestPole } from "../ingest/ingest.ts";

ensureSchema();
seedPartenaires();

const app = express();
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/public", publicRouter);
app.use("/api/admin", adminRouter);

// Pages SEO rendues côté serveur (URLs propres crawlables) + sitemap/robots
app.use("/", seoRouter);

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`▶ API formation-sante-bienetre sur http://localhost:${port}`);
  console.log(`  ex: http://localhost:${port}/api/public/formations?q=massage&dept=75`);
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
