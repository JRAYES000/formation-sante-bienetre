// Génère les images Open Graph de marque (1200×630) dans public/images/og/.
// Usage : npx tsx scripts/generate-og-images.ts
// Nécessite un Chromium accessible (variable OG_CHROMIUM ou détection Playwright).
import { chromium } from "playwright-core";
import { mkdirSync, existsSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(ROOT, "public/images/og");
const IMAGES_DIR = resolve(ROOT, "public/images");

// slug de sortie → { titre affiché, image de fond locale (optionnelle) }
const TARGETS: Record<string, { title: string; sub: string; bg?: string }> = {
  "default":                  { title: "Formations santé & bien-être", sub: "Comparateur de formations éligibles CPF", bg: "hero-bien-etre.webp" },
  "esthetique-soin-corporel": { title: "Formations Esthétique & soins", sub: "Éligibles CPF · organismes Qualiopi", bg: "metier-esthetique-soin-corporel.webp" },
  "massage-bien-etre":        { title: "Formations Massage bien-être", sub: "Éligibles CPF · organismes Qualiopi", bg: "metier-massage-bien-etre.webp" },
  "coiffure":                 { title: "Formations Coiffure", sub: "Éligibles CPF · organismes Qualiopi", bg: "metier-coiffure.webp" },
  "manucurie":                { title: "Formations Manucure & onglerie", sub: "Éligibles CPF · organismes Qualiopi", bg: "metier-manucurie.webp" },
  "maquillage":               { title: "Formations Maquillage", sub: "Éligibles CPF · organismes Qualiopi", bg: "metier-maquillage.webp" },
  "specialisation-coiffure":  { title: "Spécialisations Coiffure", sub: "Éligibles CPF · organismes Qualiopi", bg: "metier-specialisation-coiffure.webp" },
  "thalasso-thermalisme":     { title: "Formations Thalasso & thermalisme", sub: "Éligibles CPF · organismes Qualiopi", bg: "hero-bien-etre.webp" },
  "massage-esthetique":       { title: "Formations Massage esthétique", sub: "Éligibles CPF · organismes Qualiopi", bg: "metier-massage-bien-etre.webp" },
  "valorisation-image-de-soi":{ title: "Valorisation de l'image de soi", sub: "Éligibles CPF · organismes Qualiopi", bg: "hero-bien-etre.webp" },
  "art-corporel":             { title: "Formations Art corporel", sub: "Éligibles CPF · organismes Qualiopi", bg: "hero-bien-etre.webp" },
  "blog":                     { title: "Blog & guides", sub: "Métiers, financement CPF, reconversion", bg: "hero-bien-etre.webp" },
};

function pageHtml(t: { title: string; sub: string; bg?: string }): string {
  const bg = t.bg && existsSync(resolve(IMAGES_DIR, t.bg)) ? `file://${resolve(IMAGES_DIR, t.bg)}` : null;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;box-sizing:border-box}
  body{width:1200px;height:630px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;overflow:hidden;position:relative;background:#186749}
  .bg{position:absolute;inset:0;${bg ? `background:url('${bg}') center/cover no-repeat;` : ""}filter:saturate(1.05)}
  .veil{position:absolute;inset:0;background:linear-gradient(100deg,rgba(20,60,42,.94) 0%,rgba(24,103,73,.82) 45%,rgba(24,103,73,.35) 100%)}
  .content{position:absolute;inset:0;padding:70px 80px;display:flex;flex-direction:column;justify-content:space-between;color:#fff}
  .brand{display:flex;align-items:center;gap:16px;font-size:30px;font-weight:800;letter-spacing:-.5px}
  .brand .dot{width:52px;height:52px;border-radius:14px;background:rgba(255,255,255,.16);display:flex;align-items:center;justify-content:center;font-size:28px}
  h1{font-size:72px;font-weight:800;line-height:1.08;letter-spacing:-2px;max-width:900px;text-shadow:0 2px 12px rgba(0,0,0,.25)}
  .sub{display:inline-flex;align-items:center;gap:12px;font-size:30px;font-weight:600;color:rgba(255,255,255,.92)}
  .sub .chk{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.22);display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:800}
  .site{font-size:26px;font-weight:700;color:rgba(255,255,255,.85)}
  </style></head><body>
  <div class="bg"></div><div class="veil"></div>
  <div class="content">
    <div class="brand"><span class="dot">🌿</span> Formation Santé Bien-être</div>
    <div><h1>${t.title}</h1><div style="height:26px"></div><span class="sub"><span class="chk">✓</span> ${t.sub}</span></div>
    <div class="site">formation-sante-bienetre.fr</div>
  </div>
  </body></html>`;
}

const exePath = process.env.OG_CHROMIUM || "/opt/pw-browsers/chromium";
mkdirSync(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ executablePath: exePath, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
// Un chargement via file:// (et non setContent) pour que les images de fond
// locales soient autorisées par Chromium.
const tmpHtml = join(tmpdir(), `og-template-${process.pid}.html`);
for (const [slug, t] of Object.entries(TARGETS)) {
  writeFileSync(tmpHtml, pageHtml(t));
  await page.goto(`file://${tmpHtml}`, { waitUntil: "networkidle" });
  await page.screenshot({ path: resolve(OUT_DIR, `${slug}.jpg`), type: "jpeg", quality: 82 });
  console.log(`✓ og/${slug}.jpg`);
}
rmSync(tmpHtml, { force: true });
await browser.close();
