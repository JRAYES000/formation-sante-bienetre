// Pages SEO rendues côté serveur (SSR), à URLs propres et crawlables.
// La SPA (hash routing) gère l'interactif ; ces pages portent le référencement.
import { Router, type Request } from "express";
import { searchFormations, listCategories, seoDepartements, seoCombos, globalStats, seoVilles, seoVilleCombos, formationsForVille } from "./storage.ts";
import { slugify } from "./storage.ts";
import { getMetier, listMetiers, getArticle, listArticles } from "./content.ts";
import { gaId } from "./analytics.ts";

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
<script src="/analytics.js" defer></script>
<style>
  /* Tokens references/airbnb/DESIGN.md : canvas blanc, encre #222, Rausch #ff385c, Inter, cartes 14px, ombre signature */
  :root{--p:#186749;--p-active:#1b4332;--ink:#222222;--body:#3f3f3f;--muted:#6a6a6a;--hairline:#dddddd;--surface:#f7f7f7}
  *{box-sizing:border-box} body{margin:0;font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:#fff;line-height:1.5}
  a{color:var(--ink)} .wrap{max-width:1000px;margin:0 auto;padding:0 16px}
  header{background:#fff;border-bottom:1px solid var(--hairline)} header .wrap{display:flex;align-items:center;gap:8px;height:64px;font-weight:700}
  h1{font-size:1.75rem;margin:24px 0 8px;letter-spacing:-.5px;color:var(--ink)} .lead{color:var(--body);margin:0 0 20px}
  .grid{display:grid;grid-template-columns:1fr;gap:16px} @media(min-width:640px){.grid{grid-template-columns:1fr 1fr}}
  .card{background:#fff;border:1px solid var(--hairline);border-radius:14px;padding:16px;transition:box-shadow .2s}
  .card:hover{box-shadow:rgba(0,0,0,.02) 0 0 0 1px,rgba(0,0,0,.04) 0 2px 6px 0,rgba(0,0,0,.1) 0 4px 8px 0}
  .card .t{font-weight:600;display:block;margin-bottom:4px;color:var(--ink)} .muted{color:var(--muted);font-size:.9rem}
  .badge{display:inline-block;font-size:.72rem;font-weight:600;background:rgba(24,103,73,.1);color:var(--p);border-radius:99px;padding:3px 9px;margin-bottom:6px}
  .price{color:var(--ink);font-weight:700;margin-top:8px;display:block}
  nav.crumb{font-size:.85rem;color:var(--muted);margin:18px 0} nav.crumb a{text-decoration:none}
  .mesh{margin:28px 0} .mesh h2{font-size:1.1rem} .chips{display:flex;flex-wrap:wrap;gap:8px}
  .chip{background:var(--surface);border:1px solid var(--hairline);border-radius:99px;padding:6px 12px;text-decoration:none;font-size:.9rem;color:var(--body)}
  .cta{display:inline-block;background:var(--p);color:#fff;font-weight:500;border-radius:8px;padding:11px 20px;text-decoration:none;margin:8px 0 24px}
  .cta:hover{background:var(--p-active)}
  .mesh ul{margin:.4rem 0 0 1.1rem} .mesh li{margin:.25rem 0}
  .article{line-height:1.7;color:var(--body)} .article h2{font-size:1.25rem;color:var(--ink);margin:1.6rem 0 .5rem} .article h3{font-size:1.05rem;color:var(--ink);margin:1.2rem 0 .4rem} .article p{margin:.7rem 0} .article ul,.article ol{margin:.6rem 0 .6rem 1.2rem} .article li{margin:.25rem 0} .article a{color:var(--p)} .article strong{color:var(--ink)}
  .article table{border-collapse:collapse;width:100%;margin:1rem 0;font-size:.92rem} .article th,.article td{border:1px solid var(--hairline);padding:8px 10px;text-align:left} .article th{background:var(--surface)}
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
<p style="margin:0 0 10px"><a href="/metiers">Métiers</a> · <a href="/villes">Villes</a> · <a href="/blog">Blog</a> · <a href="/financement-cpf">Financement CPF</a> · <a href="/formations">Toutes les formations</a></p>
<p style="margin:0 0 10px"><a href="/mentions-legales">Mentions légales</a> · <a href="/politique-confidentialite">Politique de confidentialité</a></p>
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

// Liste de toutes les URLs indexables (sitemap + IndexNow).
export function allIndexableUrls(base: string): string[] {
  const cats = listCategories() as { slug: string; n: number }[];
  const dcode = deptByCode();
  const urls: string[] = [`${base}/formations`, `${base}/financement-cpf`, `${base}/metiers`, `${base}/blog`, `${base}/mentions-legales`, `${base}/politique-confidentialite`];
  for (const c of cats) if (c.n > 0) urls.push(`${base}/formations/${c.slug}`);
  for (const m of listMetiers()) urls.push(`${base}/metier/${m.slug}`);
  for (const a of listArticles()) urls.push(`${base}/blog/${a.slug}`);
  urls.push(`${base}/villes`);
  for (const v of seoVilles()) urls.push(`${base}/ville/${v.slug}`);
  for (const c of seoVilleCombos()) urls.push(`${base}/ville/${slugify(c.ville)}/${c.categorie}`);
  for (const combo of seoCombos()) {
    const d = dcode.get(combo.code);
    if (d) urls.push(`${base}/formations/${combo.categorie}/${d.slug}`);
  }
  return urls;
}

seoRouter.get("/sitemap.xml", (req, res) => {
  const urls = allIndexableUrls(baseUrl(req));
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

// ---------- page financement CPF (explainer + confiance) ----------
seoRouter.get("/financement-cpf", (req, res) => {
  const base = baseUrl(req);
  const canonical = `${base}/financement-cpf`;
  const s = globalStats();
  const cats = (listCategories() as { slug: string; nom: string; n: number }[]).filter((c) => c.n > 0).slice(0, 8);
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Les formations bien-être sont-elles éligibles au CPF ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui : les formations certifiantes (titre RNCP ou certification RS) dispensées par des organismes certifiés Qualiopi sont finançables par le CPF, parfois jusqu'à 100 %.",
        },
      },
      {
        "@type": "Question",
        name: "Comment utiliser mon CPF pour une formation ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Connectez-vous sur moncompteformation.gouv.fr, recherchez votre formation, puis mobilisez vos droits. Un reste à charge peut être complété par Pôle emploi, votre employeur ou vos fonds propres.",
        },
      },
    ],
  };
  const body = `<h1>Financer sa formation bien-être avec le CPF</h1>
<p class="lead">Le Compte Personnel de Formation (CPF) finance les formations certifiantes en esthétique, massage bien-être, coiffure et soins — souvent <strong>jusqu'à 100 %</strong>.</p>
<div class="chips" style="margin:0 0 24px">
  <span class="chip"><strong>${s.formations.toLocaleString("fr-FR")}</strong> formations CPF</span>
  <span class="chip"><strong>${s.organismes}</strong> organismes</span>
  <span class="chip"><strong>${s.qualiopi}</strong> certifiés Qualiopi</span>
</div>
<div class="mesh"><h2>Comment ça marche, en 3 étapes</h2>
  <p>1. <strong>Vérifiez vos droits</strong> sur moncompteformation.gouv.fr.<br>
     2. <strong>Choisissez votre formation</strong> certifiante (RNCP ou RS) dispensée par un organisme Qualiopi.<br>
     3. <strong>Mobilisez votre CPF</strong> ; un éventuel reste à charge peut être complété (Pôle emploi, employeur, fonds propres).</p>
</div>
<div class="mesh"><h2>Explorer les formations finançables</h2><div class="chips">
${cats.map((c) => `<a class="chip" href="/formations/${c.slug}">${esc(c.nom)} (${c.n})</a>`).join("")}
</div></div>
<a class="cta" href="/#/recherche">Trouver ma formation CPF</a>`;

  res.send(
    renderPage({
      title: "Financer sa formation bien-être avec le CPF | Formation Santé Bien-être",
      description: "Comment financer une formation bien-être (esthétique, massage, coiffure) avec le CPF : éligibilité, démarches, jusqu'à 100 % pris en charge.",
      canonical,
      jsonLd: [faq],
      breadcrumb: [{ name: "Accueil", url: `${base}/formations` }, { name: "Financement CPF" }],
      body,
    })
  );
});

// ---------- pages légales (RGPD) ----------
const LEGAL_DISCLAIMER = `<p class="muted" style="background:var(--surface);border:1px solid var(--hairline);border-radius:10px;padding:12px">Document fourni à titre informatif. Pour la revente de leads à des tiers et le transfert de données hors UE, une validation par un professionnel du droit est recommandée.</p>`;

seoRouter.get("/mentions-legales", (req, res) => {
  const base = baseUrl(req);
  const body = `<h1>Mentions légales</h1>
${LEGAL_DISCLAIMER}
<div class="mesh"><h2>Éditeur du site</h2><p>
Le site <strong>formation-sante-bienetre.fr</strong> est édité par :<br>
Raison sociale : <strong>ÉCOLE DE NATUROPATHIE ET SOPHROLOGIE</strong><br>
Forme juridique : SAS (société par actions simplifiée)<br>
Siège social : 229 rue Saint-Honoré, 75001 Paris<br>
SIREN : 924 997 539 — SIRET (siège) : 924 997 539 00011 — APE : 85.59B<br>
Email : <a href="mailto:contact@ecole-naturo.fr">contact@ecole-naturo.fr</a><br>
Directeur de la publication : Julien Rayes
</p></div>
<div class="mesh"><h2>Hébergement</h2><p>
Le site est hébergé par <strong>Railway Corporation</strong> (548 Market Street, San Francisco, CA 94104, États-Unis — railway.com). Le nom de domaine est géré via Hostinger.
</p></div>
<div class="mesh"><h2>Propriété intellectuelle</h2><p>
La présentation, la charte graphique et les contenus éditoriaux du site sont protégés. Les données relatives aux formations proviennent du catalogue public « Mon Compte Formation » (Caisse des Dépôts) et restent la propriété de leurs organismes respectifs.
</p></div>
<div class="mesh"><h2>Données personnelles</h2><p>
Le traitement de vos données est décrit dans notre <a href="/politique-confidentialite">Politique de confidentialité</a>.
</p></div>`;
  res.send(renderPage({ title: "Mentions légales | Formation Santé Bien-être", description: "Mentions légales du site formation-sante-bienetre.fr.", canonical: `${base}/mentions-legales`, breadcrumb: [{ name: "Accueil", url: `${base}/formations` }, { name: "Mentions légales" }], body }));
});

seoRouter.get("/politique-confidentialite", (req, res) => {
  const base = baseUrl(req);
  const cookiesSection = gaId()
    ? `<div class="mesh"><h2>Cookies &amp; mesure d'audience</h2><p>Ce site utilise <strong>Google Analytics 4</strong> (fourni par Google) pour mesurer son audience de façon agrégée, <strong>uniquement si vous y consentez</strong> via la bannière affichée lors de votre première visite. Aucun cookie de mesure n'est déposé tant que vous n'avez pas accepté ; vous pouvez retirer votre consentement à tout moment en supprimant les cookies de ce site dans votre navigateur. Google Analytics 4 ne conserve pas votre adresse IP. Les statistiques sont susceptibles d'être traitées par Google hors de l'Union européenne, dans le cadre du Data Privacy Framework UE–États-Unis. Aucun cookie publicitaire n'est utilisé. La police d'écriture est chargée via Google Fonts.</p></div>`
    : `<div class="mesh"><h2>Cookies</h2><p>Ce site n'utilise <strong>aucun cookie publicitaire ni outil de traçage analytique</strong> à ce jour. Seules des ressources techniques nécessaires à son affichage sont utilisées (dont la police d'écriture chargée via Google Fonts).</p></div>`;
  const body = `<h1>Politique de confidentialité</h1>
${LEGAL_DISCLAIMER}
<p class="lead">Cette politique explique comment vos données personnelles sont collectées et utilisées lorsque vous demandez des informations sur une formation via ce site.</p>
<div class="mesh"><h2>Responsable du traitement</h2><p>ÉCOLE DE NATUROPATHIE ET SOPHROLOGIE (SAS), 229 rue Saint-Honoré, 75001 Paris, joignable à <a href="mailto:contact@ecole-naturo.fr">contact@ecole-naturo.fr</a>.</p></div>
<div class="mesh"><h2>Données collectées</h2><ul>
<li><strong>Formulaire « Je m'informe »</strong> : nom et prénom, email, téléphone (facultatif), et informations de qualification facultatives (budget, délai, mode de financement, niveau).</li>
<li><strong>Avis</strong> : prénom (facultatif) et commentaire.</li>
<li><strong>Newsletter</strong> : adresse email.</li>
</ul></div>
<div class="mesh"><h2>Finalités</h2><ul>
<li>Vous mettre en relation avec l'organisme de formation concerné et nos partenaires afin qu'ils vous recontactent.</li>
<li>Vous transmettre des informations sur les formations demandées.</li>
<li>Vous envoyer notre lettre d'information (si vous y avez consenti).</li>
</ul></div>
<div class="mesh"><h2>Base légale</h2><p>Vos données sont traitées sur la base de <strong>votre consentement</strong>, recueilli explicitement via la case à cocher du formulaire. Vous pouvez le retirer à tout moment.</p></div>
<div class="mesh"><h2>Destinataires</h2><p>Vos coordonnées sont <strong>transmises à l'organisme de formation</strong> concerné ainsi qu'à <strong>nos partenaires</strong> (dont École Naturo) dans le seul but de répondre à votre demande. Elles ne sont jamais vendues à des tiers à des fins publicitaires.</p></div>
<div class="mesh"><h2>Transfert hors Union européenne</h2><p>Le site étant hébergé par Railway (États-Unis), vos données peuvent être stockées hors UE. Des garanties appropriées (clauses contractuelles types) encadrent ce transfert.</p></div>
<div class="mesh"><h2>Durée de conservation</h2><p>Vos données sont conservées le temps nécessaire au traitement de votre demande, puis archivées ou supprimées au plus tard <strong>3 ans</strong> après le dernier contact.</p></div>
<div class="mesh"><h2>Vos droits</h2><p>Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition, de portabilité et de retrait du consentement. Pour les exercer : <a href="mailto:contact@ecole-naturo.fr">contact@ecole-naturo.fr</a>. Vous pouvez aussi introduire une réclamation auprès de la <strong>CNIL</strong> (cnil.fr).</p></div>
${cookiesSection}`;
  res.send(renderPage({ title: "Politique de confidentialité | Formation Santé Bien-être", description: "Comment vos données personnelles sont traitées sur formation-sante-bienetre.fr (RGPD).", canonical: `${base}/politique-confidentialite`, breadcrumb: [{ name: "Accueil", url: `${base}/formations` }, { name: "Politique de confidentialité" }], body }));
});

// ---------- pages ville ----------
function titleCaseVille(v: string): string {
  return v.toLowerCase().replace(/(^|[\s-])(.)/g, (_m, sep, ch) => sep + (ch as string).toUpperCase());
}
function villeBySlug() {
  const map = new Map<string, { ville: string; slug: string; n: number }>();
  for (const v of seoVilles()) map.set(v.slug, v);
  return map;
}

seoRouter.get("/villes", (req, res) => {
  const base = baseUrl(req);
  const villes = seoVilles();
  const body = `<h1>Se former près de chez vous</h1>
<p class="lead">Trouvez une formation beauté &amp; bien-être dans votre ville.</p>
<div class="chips">${villes.map((v) => `<a class="chip" href="/ville/${v.slug}">${esc(titleCaseVille(v.ville))} (${v.n})</a>`).join("")}</div>`;
  res.send(
    renderPage({
      title: "Formations par ville | Formation Santé Bien-être",
      description: "Trouvez une formation beauté et bien-être dans votre ville (esthétique, massage, coiffure).",
      canonical: `${base}/villes`,
      breadcrumb: [{ name: "Accueil", url: `${base}/formations` }, { name: "Villes" }],
      body,
    })
  );
});

seoRouter.get("/ville/:slug", (req, res, next) => {
  const v = villeBySlug().get(req.params.slug);
  if (!v) return next();
  const base = baseUrl(req);
  const nomV = titleCaseVille(v.ville);
  const items = formationsForVille(v.ville);
  const cats = catIndex();
  const mesh = seoVilleCombos()
    .filter((c) => slugify(c.ville) === v.slug)
    .map((c) => {
      const cat = cats.get(c.categorie);
      return cat ? `<a class="chip" href="/ville/${v.slug}/${c.categorie}">${esc(cat.nom)} (${c.n})</a>` : "";
    })
    .join("");
  const canonical = `${base}/ville/${v.slug}`;
  const body = `<h1>Formations beauté &amp; bien-être à ${esc(nomV)}</h1>
<p class="lead">${v.n} formations CPF dispensées par des organismes situés à ${esc(nomV)}.</p>
${mesh ? `<div class="mesh"><h2>Par métier à ${esc(nomV)}</h2><div class="chips">${mesh}</div></div>` : ""}
${formationCards(items)}`;
  res.send(
    renderPage({
      title: `Formations beauté & bien-être à ${nomV} – CPF | Formation Santé Bien-être`,
      description: `${v.n} formations CPF en beauté et bien-être à ${nomV}. Comparez les organismes et demandez vos informations.`,
      canonical,
      jsonLd: [courseListLd(items, canonical)],
      breadcrumb: [{ name: "Accueil", url: `${base}/formations` }, { name: "Villes", url: `${base}/villes` }, { name: nomV }],
      body,
    })
  );
});

seoRouter.get("/ville/:slug/:categorie", (req, res, next) => {
  const v = villeBySlug().get(req.params.slug);
  const cat = catIndex().get(req.params.categorie);
  if (!v || !cat) return next();
  const items = formationsForVille(v.ville, req.params.categorie);
  if (items.length === 0) return next();
  const base = baseUrl(req);
  const nomV = titleCaseVille(v.ville);
  const canonical = `${base}/ville/${v.slug}/${req.params.categorie}`;
  const body = `<h1>Formation ${esc(cat.nom)} à ${esc(nomV)}</h1>
<p class="lead">${items.length} formation(s) ${esc(cat.nom)} à ${esc(nomV)}, éligibles au CPF.</p>
<a class="cta" href="/ville/${v.slug}">Toutes les formations à ${esc(nomV)}</a>
${formationCards(items)}`;
  res.send(
    renderPage({
      title: `Formation ${cat.nom} à ${nomV} – CPF | Formation Santé Bien-être`,
      description: `Formations ${cat.nom} à ${nomV} éligibles au CPF. Organismes, tarifs, à distance ou présentiel.`,
      canonical,
      jsonLd: [courseListLd(items, canonical)],
      breadcrumb: [
        { name: "Accueil", url: `${base}/formations` },
        { name: "Villes", url: `${base}/villes` },
        { name: nomV, url: `${base}/ville/${v.slug}` },
        { name: cat.nom },
      ],
      body,
    })
  );
});

// ---------- fiches métier (contenu éditorial) ----------
function ulBlock(title: string, items?: string[]): string {
  if (!items?.length) return "";
  return `<div class="mesh"><h2>${esc(title)}</h2><ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>`;
}

seoRouter.get("/metiers", (req, res) => {
  const base = baseUrl(req);
  const body = `<h1>Les métiers de la beauté et du bien-être</h1>
<p class="lead">Missions, formations, salaires et débouchés — tout pour choisir votre voie.</p>
<div class="grid">${listMetiers()
    .map((m) => `<div class="card"><a class="t" href="/metier/${m.slug}">${esc(m.metier)}</a></div>`)
    .join("")}</div>`;
  res.send(
    renderPage({
      title: "Métiers de la beauté et du bien-être | Formation Santé Bien-être",
      description: "Découvrez les métiers de la beauté et du bien-être : missions, formations CPF, salaires et débouchés.",
      canonical: `${base}/metiers`,
      breadcrumb: [{ name: "Accueil", url: `${base}/formations` }, { name: "Métiers" }],
      body,
    })
  );
});

seoRouter.get("/metier/:slug", (req, res, next) => {
  const m = getMetier(req.params.slug);
  if (!m) return next();
  const base = baseUrl(req);
  const canonical = `${base}/metier/${m.slug}`;
  const hasCat = catIndex().has(m.slug);
  const faqLd = m.faq?.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: m.faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })),
      }
    : null;
  const body = `<h1>${esc(m.titre)}</h1>
<p class="lead">${esc(m.intro ?? "")}</p>
<a class="cta" href="${hasCat ? `/formations/${m.slug}` : "/#/recherche"}">Voir les formations ${esc(m.metier)}</a>
${ulBlock("Missions", m.missions)}
${ulBlock("Compétences", m.competences)}
${ulBlock("Débouchés", m.debouches)}
${m.salaire ? `<div class="mesh"><h2>Salaire</h2><p>Débutant : <strong>${esc(m.salaire.debutant ?? "—")}</strong> · Confirmé : <strong>${esc(m.salaire.confirme ?? "—")}</strong><br><span class="muted">${esc(m.salaire.note ?? "")}</span></p></div>` : ""}
${ulBlock("Évolutions de carrière", m.evolution)}
${m.formationConseil ? `<div class="mesh"><h2>Quelle formation choisir ?</h2><p>${esc(m.formationConseil)}</p></div>` : ""}
${m.faq?.length ? `<div class="mesh"><h2>Questions fréquentes</h2>${m.faq.map((x) => `<p><strong>${esc(x.q)}</strong><br>${esc(x.a)}</p>`).join("")}</div>` : ""}
<div class="mesh"><h2>Autres métiers</h2><div class="chips">${listMetiers()
    .filter((x) => x.slug !== m.slug)
    .map((x) => `<a class="chip" href="/metier/${x.slug}">${esc(x.metier)}</a>`)
    .join("")}</div></div>`;
  res.send(
    renderPage({
      title: `${m.titre} | Formation Santé Bien-être`,
      description: m.metaDescription ?? m.intro ?? "",
      canonical,
      jsonLd: faqLd ? [faqLd] : [],
      breadcrumb: [{ name: "Accueil", url: `${base}/formations` }, { name: "Métiers", url: `${base}/metiers` }, { name: m.metier }],
      body,
    })
  );
});

// ---------- blog ----------
seoRouter.get("/blog", (req, res) => {
  const base = baseUrl(req);
  const arts = listArticles();
  const body = `<h1>Blog — formations & métiers du bien-être</h1>
<p class="lead">Conseils, financement CPF et orientation pour se former et se reconvertir.</p>
<div class="grid">${arts
    .map((a) => `<div class="card"><a class="t" href="/blog/${a.slug}">${esc(a.title)}</a><p class="muted">${esc(a.excerpt)}</p></div>`)
    .join("")}</div>`;
  res.send(
    renderPage({
      title: "Blog | Formation Santé Bien-être",
      description: "Conseils formation, financement CPF et métiers de la beauté et du bien-être.",
      canonical: `${base}/blog`,
      breadcrumb: [{ name: "Accueil", url: `${base}/formations` }, { name: "Blog" }],
      body,
    })
  );
});

seoRouter.get("/blog/:slug", (req, res, next) => {
  const a = getArticle(req.params.slug);
  if (!a) return next();
  const base = baseUrl(req);
  const canonical = `${base}/blog/${a.slug}`;
  const ld = { "@context": "https://schema.org", "@type": "Article", headline: a.title, description: a.metaDescription, mainEntityOfPage: canonical };
  const body = `<h1>${esc(a.title)}</h1>
<article class="article">${a.html}</article>
<a class="cta" href="/#/recherche">Explorer les formations</a>`;
  res.send(
    renderPage({
      title: `${a.title} | Formation Santé Bien-être`,
      description: a.metaDescription,
      canonical,
      jsonLd: [ld],
      breadcrumb: [{ name: "Accueil", url: `${base}/formations` }, { name: "Blog", url: `${base}/blog` }, { name: a.title }],
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
