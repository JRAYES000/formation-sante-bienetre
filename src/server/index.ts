// Bootstrap Express. En dev : npm run dev (tsx watch). Sert l'API publique.
import "dotenv/config";
import express from "express";
import { ensureSchema } from "../db/index.ts";
import { seedPartenaires } from "./storage.ts";
import { publicRouter, adminRouter } from "./routes.ts";

ensureSchema();
seedPartenaires();

const app = express();
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/public", publicRouter);
app.use("/api/admin", adminRouter);

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`▶ API formation-sante-bienetre sur http://localhost:${port}`);
  console.log(`  ex: http://localhost:${port}/api/public/formations?q=massage&dept=75`);
});
