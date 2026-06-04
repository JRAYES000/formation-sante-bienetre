// Pages SEO rendues côté serveur (SSR), à URLs propres et crawlables.
// La SPA (hash routing) gère l'interactif ; ces pages portent le référencement.
import { Router, type Request } from "express";
import { searchFormations, listCategories, seoDepartements, seoCombos } from "./storage.ts";

export const seoRouter = Router();

// ---------- utils ----------
function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function baseUrl(req: Request): string {
  return process.env.PUBLIC_URL ?? `${req.protocol}://${req.get("host")}`;
}

function eur(n: number | null | undefined): string {
  return n == null ? "Prix sur demande" : `${Math.round(n).toLocaleString("fr-FR")} €`;
}

interface PageOpts {
  title: string;
  description: string;
  canonical: string;
  jsonLd?: object[];
  breadcrumb: { name: string; url?: string }[];
  body: string;
}

function renderPage(o: PageOpts): string {
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: o.breadcrumb.map((b, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: b.name,
        ...(b.url ? { item: b.url } : {}),
      })),
    },
    ...(o.jsonLd ?? []),
  ];
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}">
<link rel="canonical" href="${esc(o.canonical)}">
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.description)}">
<meta property="og:type" content="website">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>
  /* Tokens references/airbnb/DESIGN.md : canvas blanc, encre #222, Rausch #ff385c, Inter, cartes 14px, ombre signature */
  :root{--p:#ff385c;--p-active:#e00b41;--ink:#222222;--body:#3f3f3f;--muted:#6a6a6a;--hairline:#dddddd;--surface:#f7f7f7}
  *{box-sizing:border-box} body{margin:0;font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:#fff;line-height:1.5}
  a{color:var(--ink)} .wrap{max-width:1000px;margin:0 auto;padding:0 16px}
  header{background:#fff;border-bottom:1px solid var(--hairline)} header .wrap{display:flex;align-items:center;gap:8px;height:64px;font-weight:700}
  h1{font-size:1.75rem;margin:24px 0 8px;letter-spacing:-.5px;color:var(--ink)} .lead{color:var(--body);margin:0 0 20px}
  .grid{display:grid;grid-template-columns:1fr;gap:16px} @media(min-width:640px){.grid{grid-template-columns:1fr 1fr}}
  .card{background:#fff;border:1px solid var(--hairline);border-radius:14px;padding:16px;transition:box-shadow .2s}
  .card:hover{box-shadow:rgba(0,0,0,.02) 0 0 0 1px,rgba(0,0,0,.04) 0 2px 6px 0,rgba(0,0,0,.1) 0 4px 8px 0}
  .card .t{font-weight:600;display:block;margin-bottom:4px;color:var(--ink)} .muted{color:var(--muted);font-size:.9rem}
  .badge{display:inline-block;font-size:.72rem;font-weight:600;background:rgba(255,56,92,.1);color:var(--p);border-radius:99px;padding:3px 9px;margin-bottom:6px}
  .price{color:var(--ink);font-weight:700;margin-top:8px;display:block}
  nav.crumb{font-size:.85rem;color:var(--muted);margin:18px 0} nav.crumb a{text-decoration:none}
  .mesh{margin:28px 0} .mesh h2{font-size:1.1rem} .chips{display:flex;flex-wrap:wrap;gap:8px}
  .chip{background:var(--surface);border:1px solid var(--hairline);border-radius:99px;padding:6px 12px;text-decoration:none;font-size:.9rem;color:var(--body)}
  .cta{display:inline-block;background:var(--p);color:#fff;font-weight:500;border-radius:8px;padding:11px 20px;text-decoration:none;margin:8px 0 24px}
  .cta:hover{background:var(--p-active)}
  footer{border-top:1px solid var(--hairline);background:#fff;margin-top:40px;color:var(--muted);font-size:.85rem}
</style>
</head>
<body>
<header><div class="wrap"><a href="/formations" style="text-decoration:none;color:var(--p)">🌿 Formation Santé Bien-être</a></div></header>
<main class="wrap">
<nav class="crumb">${o.breadcrumb
    .map((b, i) => (b.url && i < o.breadcrumb.length - 1 ? `<a href="${esc(b.url)}">${esc(b.name)}</a>` : esc(b.name)))
    .join(" › ")}</nav>
${o.body}
</main>
<footer><div class="wrap" style="padding:20px 16px">
<p>Comparateur de formations CPF en esthétique, massage bien-être, coiffure et soins. Données issues du catalogue public Mon Compte Formation.</p>
</div></footer>
</body>
</html>`;
}

function formationCards(items: any[]): string {
  if (!items.length) return `<p class="muted">Aucune formation disponible pour ce critère pour le moment.</p>`;
  return `<div class="grid">${items
    .map(
      (f) => `<div class="card">
${f.categorie_nom ? `<span class="badge">${esc(f.categorie_nom)}</span>` : ""}
<a class="t" href="/#/formation/${encodeURIComponent(f.numero_formation)}">${esc(f.intitule)}</a>
<span class="muted">${esc(f.organisme ?? "")}</span>
<span class="muted">${f.a_distance ? "À distance possible" : "Présentiel"}${f.type_referentiel ? " · " + esc(f.type_referentiel) : ""} · Éligible CPF${f.organisme_qualiopi ? " · Qualiopi" : ""}</span>
<span class="price">${eur(f.prix_min)}</span>
</div>`
    )
    .join("")}</div>`;
}

function courseListLd(items: any[], canonical: string): object {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.slice(0, 25).map((f, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Course",
        name: f.intitule,
        ...(f.organisme ? { provider: { "@type": "Organization", name: f.organisme } } : {}),
      },
    })),
    url: canonical,
  };
}

// ---------- index helpers ----------
function catIndex() {
  const map = new Map<string, { nom: string; n: number }>();
  for (const c of listCategories() as { slug: string; nom: string; n: number }[]) map.set(c.slug, { nom: c.nom, n: c.n });
  return map;
}
function deptBySlug() {
  const map = new Map<string, { code: string; nom: string; slug: string }>();
  for (const d of seoDepartements()) map.set(d.slug, d);
  return map;
}
function deptByCode() {
  const map = new Map<string, { code: string; nom: string; slug: string }>();
  for (const d of seoDepartements()) map.set(d.code, d);
  return map;
}

// ---------- robots & sitemap ----------
seoRouter.get("/robots.txt", (req, res) => {
  res.type("text/plain").send(`User-agent: *\nAllow: /\nSitemap: ${baseUrl(req)}/sitemap.xml\n`);
});

seoRouter.get("/sitemap.xml", (req, res) => {
  const base = baseUrl(req);
  const cats = listCategories() as { slug: string; n: number }[];
  const dcode = deptByCode();
  const urls: string[] = [`${base}/formations`];
  for (const c of cats) if (c.n > 0) urls.push(`${base}/formations/${c.slug}`);
  for (const combo of seoCombos()) {
    const d = dcode.get(combo.code);
    if (d) urls.push(`${base}/formations/${combo.categorie}/${d.slug}`);
  }
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${esc(u)}</loc></url>`).join("\n") +
    `\n</urlset>\n`;
  res.type("application/xml").send(xml);
});

// ---------- hub ----------
seoRouter.get("/formations", (req, res) => {
  const cats = (listCategories() as { slug: string; nom: string; n: number }[]).filter((c) => c.n > 0);
  const canonical = `${baseUrl(req)}/formations`;
  const body = `<h1>Formations santé & bien-être éligibles CPF</h1>
<p class="lead">Esthétique, massage bien-être, coiffure, soins… Comparez les organismes par métier et par département.</p>
<a class="cta" href="/#/recherche">Rechercher une formation</a>
<div class="mesh"><h2>Par métier</h2><div class="chips">
${cats.map((c) => `<a class="chip" href="/formations/${c.slug}">${esc(c.nom)} (${c.n})</a>`).join("")}
</div></div>`;
  res.send(
    renderPage({
      title: "Formations santé & bien-être éligibles CPF | Formation Santé Bien-être",
      description: "Comparez les formations en esthétique, massage bien-être, coiffure et soins, financées par le CPF, par métier et par département.",
      canonical,
      breadcrumb: [{ name: "Accueil", url: `${baseUrl(req)}/formations` }, { name: "Formations" }],
      body,
    })
  );
});

// ---------- métier (national) ----------
seoRouter.get("/formations/:categorie", (req, res, next) => {
  const cats = catIndex();
  const cat = cats.get(req.params.categorie);
  if (!cat) return next();
  const slug = req.params.categorie;
  const r = searchFormations({ categorie: slug, pageSize: 50 });
  const base = baseUrl(req);
  const canonical = `${base}/formations/${slug}`;
  const dcode = deptByCode();

  const meshDept = r.facets.departements
    .slice(0, 24)
    .map((d: any) => {
      const di = dcode.get(d.code);
      return di ? `<a class="chip" href="/formations/${slug}/${di.slug}">${esc(d.nom)} (${d.n})</a>` : "";
    })
    .join("");
  const meshCat = [...cats.entries()]
    .filter(([s, c]) => s !== slug && c.n > 0)
    .slice(0, 12)
    .map(([s, c]) => `<a class="chip" href="/formations/${s}">${esc(c.nom)}</a>`)
    .join("");

  const body = `<h1>Formations ${esc(cat.nom)} éligibles CPF</h1>
<p class="lead">${r.total} formation(s) en ${esc(cat.nom)} financables par le CPF, proposées par des organismes partout en France. Demandez vos informations gratuitement.</p>
<a class="cta" href="/#/categorie/${slug}">Affiner ma recherche</a>
${formationCards(r.items)}
<div class="mesh"><h2>${esc(cat.nom)} par département</h2><div class="chips">${meshDept}</div></div>
<div class="mesh"><h2>Autres métiers</h2><div class="chips">${meshCat}</div></div>`;

  res.send(
    renderPage({
      title: `Formations ${cat.nom} CPF – comparez les organismes | Formation Santé Bien-être`,
      description: `Comparez ${r.total} formations ${cat.nom} éligibles au CPF. Tarifs, organismes, présentiel ou à distance. Demande d'information gratuite.`,
      canonical,
      jsonLd: [courseListLd(r.items, canonical)],
      breadcrumb: [
        { name: "Accueil", url: `${base}/formations` },
        { name: "Formations", url: `${base}/formations` },
        { name: cat.nom },
      ],
      body,
    })
  );
});

// ---------- métier × département ----------
seoRouter.get("/formations/:categorie/:dept", (req, res, next) => {
  const cats = catIndex();
  const cat = cats.get(req.params.categorie);
  const dept = deptBySlug().get(req.params.dept);
  if (!cat || !dept) return next();
  const slug = req.params.categorie;
  const r = searchFormations({ categorie: slug, dept: dept.code, pageSize: 50 });
  const base = baseUrl(req);
  const canonical = `${base}/formations/${slug}/${dept.slug}`;

  // Mesh : autres départements pour ce métier (depuis une recherche métier seule)
  const national = searchFormations({ categorie: slug, pageSize: 1 });
  const dcode = deptByCode();
  const meshDept = national.facets.departements
    .filter((d: any) => d.code !== dept.code)
    .slice(0, 18)
    .map((d: any) => {
      const di = dcode.get(d.code);
      return di ? `<a class="chip" href="/formations/${slug}/${di.slug}">${esc(d.nom)} (${d.n})</a>` : "";
    })
    .join("");

  const body = `<h1>Formation ${esc(cat.nom)} – ${esc(dept.nom)}</h1>
<p class="lead">${r.total} formation(s) ${esc(cat.nom)} dans le département ${esc(dept.nom)}, éligibles au CPF. Comparez les organismes et demandez vos informations.</p>
<a class="cta" href="/#/categorie/${slug}">Voir toutes les ${esc(cat.nom)}</a>
${formationCards(r.items)}
<div class="mesh"><h2>${esc(cat.nom)} dans d'autres départements</h2><div class="chips">${meshDept}</div></div>`;

  res.send(
    renderPage({
      title: `Formation ${cat.nom} ${dept.nom} – CPF | Formation Santé Bien-être`,
      description: `${r.total} formations ${cat.nom} dans le ${dept.nom} éligibles au CPF. Organismes, tarifs, présentiel ou à distance. Demande gratuite.`,
      canonical,
      jsonLd: [courseListLd(r.items, canonical)],
      breadcrumb: [
        { name: "Accueil", url: `${base}/formations` },
        { name: "Formations", url: `${base}/formations` },
        { name: cat.nom, url: `${base}/formations/${slug}` },
        { name: dept.nom },
      ],
      body,
    })
  );
});
