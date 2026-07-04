// Bootstrap Express. En dev : npm run dev (tsx watch). Sert l'API publique.
import "dotenv/config";
import express from "express";
import compression from "compression";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureSchema } from "../db/index.ts";
import { seedPartenaires, countFormations } from "./storage.ts";
import { publicRouter, adminRouter } from "./routes.ts";
import { seoRouter } from "./seo.ts";
import { analyticsRouter } from "./analytics.ts";
import { INDEXNOW_KEY } from "./indexnow.ts";
import { ingestPole } from "../ingest/ingest.ts";
import { enrichVilles, villesAEnrichirCount } from "../enrich/villes.ts";

ensureSchema();
seedPartenaires();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const publicDir = resolve(__dirname, "../../dist/public");

// Redirection 301 vers l'origine canonique (https + host de PUBLIC_URL) : évite
// l'indexation des variantes http:// et www. Inactif sans PUBLIC_URL (dev) et
// sur /api (healthchecks Railway et appels internes).
const canonicalOrigin = (() => {
  try {
    return process.env.PUBLIC_URL ? new URL(process.env.PUBLIC_URL) : null;
  } catch {
    return null;
  }
})();
if (canonicalOrigin) {
  app.use((req, res, next) => {
    if (req.path.startsWith("/api") || (req.method !== "GET" && req.method !== "HEAD")) return next();
    const proto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0].trim() ?? req.protocol;
    const host = req.get("host");
    if (host !== canonicalOrigin.host || proto !== canonicalOrigin.protocol.replace(":", "")) {
      return res.redirect(301, `${canonicalOrigin.origin}${req.originalUrl}`);
    }
    next();
  });
}

// En-têtes de sécurité HTTP (défense en profondeur — n'affecte ni le SEO ni le rendu).
// CSP calibrée pour le site : <style>/JSON-LD inline du SSR, Google Fonts, /analytics.js et GA4 (après consentement).
app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "SAMEORIGIN");
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // HSTS uniquement sur connexion HTTPS (Railway termine le TLS → x-forwarded-proto). max-age 180 j, sans includeSubDomains (www non garanti en HTTPS).
  const proto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0].trim();
  if (req.secure || proto === "https") {
    res.set("Strict-Transport-Security", "max-age=15552000");
  }
  res.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "img-src 'self' data: https:",
      "font-src 'self' https://fonts.gstatic.com data:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com",
      "connect-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://stats.g.doubleclick.net",
    ].join("; ")
  );
  next();
});

app.use(compression());
app.use(express.json());
// index: false → la racine "/" est rendue par le seoRouter (page d'accueil SSR),
// pas par le index.html de la SPA. Les assets Vite (/assets/*) sont hashés →
// cache long immutable ; les autres fichiers statiques (images, fonts) 7 jours.
app.use(
  express.static(publicDir, {
    index: false,
    setHeaders: (res, path) => {
      res.setHeader(
        "Cache-Control",
        path.includes("/assets/") ? "public, max-age=2592000, immutable" : "public, max-age=604800"
      );
    },
  })
);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Fichier de vérification IndexNow (prouve la propriété du domaine pour Bing/Yandex).
app.get(`/${INDEXNOW_KEY}.txt`, (_req, res) => res.type("text/plain").send(INDEXNOW_KEY));
app.use("/api/public", publicRouter);
app.use("/api/admin", adminRouter);

// Script de mesure d'audience (GA4, chargé après consentement). Inerte si GA4_MEASUREMENT_ID absent.
app.use("/", analyticsRouter);

// Pages SEO rendues côté serveur (URLs propres crawlables) + sitemap/robots
app.use("/", seoRouter);

// SPA (hash routing) : servie sur /app (ex: /app#/formation/123, /app#/admin).
// Le fallback * reste pour les anciens chemins inconnus.
app.get("/app", (_req, res) => res.sendFile(resolve(publicDir, "index.html")));
app.get("*", (_req, res) => res.sendFile(resolve(publicDir, "index.html")));

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`▶ API formation-sante-bienetre sur http://localhost:${port}`);
  console.log(`  ex: http://localhost:${port}/api/public/formations?q=massage&dept=75`);

  // Enrichissement villes (SIRENE) en arrière-plan, une seule fois (organismes sans ville).
  const startEnrich = () => {
    const n = villesAEnrichirCount();
    if (n === 0) return;
    console.log(`🏙️ Enrichissement villes : ${n} organismes (arrière-plan, ~${Math.round((n * 0.14) / 60)} min)…`);
    enrichVilles()
      .then((s) => console.log(`🏙️ Villes : ${s.ok} trouvées, ${s.vides} non résolues.`))
      .catch((e) => console.error("🏙️ Échec enrichissement villes :", e));
  };

  // Auto-amorçage : si la base est vide (1er boot sur volume neuf), on ingère puis on enrichit.
  if (countFormations() === 0) {
    console.log("📦 Base vide → ingestion initiale du pôle…");
    ingestPole()
      .then((s) => {
        console.log(`✅ Ingestion initiale : ${s.formations} formations.`);
        startEnrich();
      })
      .catch((e) => console.error("❌ Ingestion initiale échouée :", e));
  } else {
    startEnrich();
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
