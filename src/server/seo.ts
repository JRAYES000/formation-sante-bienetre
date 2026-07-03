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

const CAT_OG_IMAGES: Record<string, string> = {
  "esthetique-soin-corporel": "https://images.unsplash.com/photo-1487412947147-5cebf100d293?w=1200&q=80&fit=crop",
  "massage-bien-etre":        "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=1200&q=80&fit=crop",
  "coiffure":                 "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=80&fit=crop",
  "manucurie":                "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1200&q=80&fit=crop",
  "maquillage":               "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=1200&q=80&fit=crop",
  "thalasso-thermalisme":     "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&q=80&fit=crop",
  "massage-esthetique":       "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=1200&q=80&fit=crop",
  "specialisation-coiffure":  "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=1200&q=80&fit=crop",
  "valorisation-image-de-soi":"https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80&fit=crop",
  "art-corporel":             "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1200&q=80&fit=crop",
};
const DEFAULT_OG_IMAGE = "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=1200&q=80&fit=crop";

interface PageOpts {
  title: string;
  description: string;
  canonical: string;
  jsonLd?: object[];
  breadcrumb: { name: string; url?: string }[];
  body: string;
  hero?: string;
  ogImage?: string;
  publishedAt?: string;
  updatedAt?: string;
  noindex?: boolean;
}

function renderPage(o: PageOpts): string {
  const siteBase = o.canonical.split("/").slice(0, 3).join("/");
  const ogImage = o.ogImage
    ? (o.ogImage.startsWith("http") ? o.ogImage : `${siteBase}${o.ogImage}`)
    : DEFAULT_OG_IMAGE;
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Formation Santé Bien-être",
      url: `${siteBase}/formations`,
      logo: { "@type": "ImageObject", url: `${siteBase}/images/logo-header.png` },
      description: "Comparateur de formations CPF en esthétique, massage bien-être, coiffure et soins. Toutes nos formations sont proposées par des organismes certifiés Qualiopi.",
      sameAs: [],
    },
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
<meta name="robots" content="${o.noindex ? "noindex,follow" : "index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1"}">
<link rel="canonical" href="${esc(o.canonical)}">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.description)}">
<meta property="og:type" content="${o.publishedAt ? "article" : "website"}">
<meta property="og:url" content="${esc(o.canonical)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:site_name" content="Formation Santé Bien-être">
${o.publishedAt ? `<meta property="article:published_time" content="${esc(o.publishedAt)}">` : ""}
${o.updatedAt ? `<meta property="article:modified_time" content="${esc(o.updatedAt)}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(o.title)}">
<meta name="twitter:description" content="${esc(o.description)}">
<meta name="twitter:image" content="${esc(ogImage)}">
<meta name="theme-color" content="#186749">
<link rel="icon" href="/images/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/images/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet"></noscript>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<script src="/analytics.js" defer></script>
<style>
  :root{--p:#186749;--p-dark:#145c3f;--p-active:#1b4332;--p-light:#e8f5ef;--ink:#1a1a1a;--body:#444;--muted:#777;--hairline:#e5e5e5;--surface:#f8f8f6;--radius:14px}
  *{box-sizing:border-box}
  body{margin:0;font-family:'Plus Jakarta Sans',system-ui,-apple-system,sans-serif;color:var(--ink);background:#fff;line-height:1.6;-webkit-font-smoothing:antialiased}
  a{color:var(--ink)}
  .wrap{max-width:1020px;margin:0 auto;padding:0 20px}

  /* Header */
  header{background:var(--p);border-bottom:1px solid rgba(0,0,0,.12);position:sticky;top:0;z-index:100}
  header .wrap{display:flex;align-items:center;justify-content:space-between;gap:8px;height:60px;font-weight:800;font-size:1rem}
  .header-nav{display:flex;align-items:center;gap:2px}
  .header-nav a{color:rgba(255,255,255,.92);text-decoration:none;font-size:.85rem;font-weight:600;padding:6px 10px;border-radius:8px;transition:background .12s,color .12s;white-space:nowrap}
  .header-nav a:hover{background:rgba(255,255,255,.15);color:#fff}
  @media(max-width:700px){.header-nav .hide-mobile{display:none}}
  @media(max-width:480px){.header-nav{display:none}}

  /* Blog */
  .blog-featured{display:block;text-decoration:none;background:var(--p);border-radius:16px;overflow:hidden;margin-bottom:32px;transition:box-shadow .2s}
  .blog-featured:hover{box-shadow:0 8px 32px rgba(24,103,73,.3)}
  .blog-featured-body{padding:32px 36px}
  .blog-featured-title{color:#fff;font-size:clamp(1.2rem,3vw,1.7rem);font-weight:800;margin:0 0 12px;line-height:1.3}
  .blog-featured-excerpt{color:rgba(255,255,255,.85);margin:0 0 20px;font-size:1rem;line-height:1.6}
  .blog-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:18px}
  @media(max-width:600px){.blog-grid{grid-template-columns:1fr}}
  .blog-grid--small{grid-template-columns:repeat(3,1fr)}
  @media(max-width:600px){.blog-grid--small{grid-template-columns:1fr}}
  .blog-card{display:flex;flex-direction:column;background:#fff;border:1px solid var(--hairline);border-radius:var(--radius);text-decoration:none;transition:box-shadow .18s,border-color .18s;overflow:hidden}
  .blog-card:hover{box-shadow:0 4px 20px rgba(0,0,0,.09);border-color:#ccc}
  .blog-card-body{padding:20px;display:flex;flex-direction:column;flex:1;gap:8px}
  .blog-card-title{font-size:1rem;font-weight:700;color:var(--ink);margin:0;line-height:1.4}
  .blog-card-excerpt{color:var(--muted);font-size:.88rem;margin:0;line-height:1.5;flex:1}
  .blog-read-more{color:var(--p);font-size:.88rem;font-weight:700;margin-top:auto}
  .blog-featured .blog-read-more{color:#fff}
  .article-cta-block{background:var(--p-light);border-radius:14px;padding:24px;margin:32px 0;border-left:4px solid var(--p)}

  /* Popular card flame badge */
  .flame-badge{display:inline-flex;align-items:center;gap:4px;background:#fff3e0;color:#e65100;font-size:.72rem;font-weight:800;border-radius:99px;padding:3px 9px;margin-bottom:4px}
  .pop-card{border:2px solid #ffe0b2}
  /* Urgency badges */
  .urgency-badge{display:inline-flex;align-items:center;gap:4px;border-radius:99px;padding:3px 10px;font-size:.72rem;font-weight:800}
  .urgency-limited{background:#fff3e0;color:#e65100}
  .urgency-last{background:#fce4ec;color:#c62828}
  .urgency-spots{background:#e3f2fd;color:#1565c0}
  /* Metier tiles grid */
  .metier-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:16px 0 32px}
  @media(max-width:700px){.metier-grid{grid-template-columns:repeat(2,1fr)}}
  .metier-tile{display:flex;flex-direction:column;align-items:center;gap:10px;padding:22px 14px;border-radius:18px;border:2px solid transparent;text-decoration:none;transition:all .2s;text-align:center}
  .metier-tile:hover{border-color:var(--p);box-shadow:0 6px 24px rgba(0,0,0,.12);transform:translateY(-3px)}
  .metier-tile .mt-em{font-size:2.6rem;line-height:1}
  .metier-tile .mt-name{font-weight:700;font-size:.88rem;color:var(--ink);line-height:1.3}
  .metier-tile .mt-cta{font-size:.76rem;color:var(--p);font-weight:700}

  /* Hero */
  .hero{background:var(--p);color:#fff;padding:52px 0 56px}
  .hero h1{font-size:clamp(1.6rem,4vw,2.4rem);font-weight:800;margin:0 0 10px;line-height:1.2;letter-spacing:-.5px}
  .hero .sub{font-size:1.05rem;opacity:.9;margin:0 0 28px;font-weight:400}
  .search-wrap{position:relative;max-width:560px}
  .search-wrap input{width:100%;padding:14px 52px 14px 18px;border:none;border-radius:12px;font-size:1rem;font-family:inherit;outline:none;background:#fff;color:var(--ink);box-shadow:0 2px 16px rgba(0,0,0,.18)}
  .search-wrap input::placeholder{color:#aaa}
  .search-btn{position:absolute;right:8px;top:50%;transform:translateY(-50%);background:var(--p-dark);border:none;border-radius:8px;padding:8px 14px;cursor:pointer;color:#fff;font-size:.95rem;font-family:inherit;font-weight:600}
  @media(max-width:600px){.search-btn{display:none}}
  @media(max-width:600px){.search-wrap input{padding-right:42px}}
  .search-wrap::after{content:none}
  @media(max-width:600px){.search-wrap::after{content:'▼';position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:.65rem;color:#aaa;pointer-events:none}}
  @media(max-width:600px){.city-search-wrap::after{content:'▼';position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:.65rem;color:#aaa;pointer-events:none}}
  .search-dropdown{display:none;position:absolute;top:calc(100% + 6px);left:0;right:0;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.15);overflow:hidden;z-index:200;max-height:320px;overflow-y:auto}
  .search-dropdown.open{display:block}
  .sd-item{display:flex;align-items:center;gap:10px;padding:11px 16px;text-decoration:none;color:var(--ink);font-size:.95rem;transition:background .12s;border-bottom:1px solid var(--hairline)}
  .sd-item:last-child{border-bottom:none}
  .sd-item:hover,.sd-item.active{background:var(--p-light)}
  .sd-item .em{font-size:1.2rem;width:26px;text-align:center}
  .sd-item .sdn{font-weight:600}
  .sd-item .sdc{font-size:.8rem;color:var(--muted);margin-left:auto}

  /* Typography */
  h1{font-size:1.9rem;margin:28px 0 8px;letter-spacing:-.5px;color:var(--ink);font-weight:800}
  h2{font-size:1.2rem;font-weight:700;color:var(--ink)}
  .lead{color:var(--body);margin:0 0 20px;font-size:1.05rem}

  /* Breadcrumb */
  nav.crumb{font-size:.82rem;color:var(--muted);margin:16px 0 4px}
  nav.crumb a{text-decoration:none;color:var(--muted)}
  nav.crumb a:hover{color:var(--p)}

  /* Page layout with sidebar */
  .page-layout{display:grid;grid-template-columns:230px 1fr;gap:28px;align-items:start;margin-top:8px}
  @media(max-width:760px){.page-layout{grid-template-columns:1fr}}
  .sidebar{position:sticky;top:72px}
  @media(max-width:760px){.sidebar{position:static}}
  /* Bouton filtres mobile */
  .filter-toggle-btn{display:none}
  @media(max-width:760px){
    .filter-toggle-btn{display:flex;align-items:center;gap:8px;background:#fff;border:1.5px solid var(--p);color:var(--p);border-radius:10px;padding:10px 18px;font-size:.9rem;font-weight:700;cursor:pointer;font-family:inherit;margin-bottom:12px;width:100%}
    .sidebar{display:none}
    .sidebar.open{display:block}
  }
  .sb-section{background:var(--surface);border:1px solid var(--hairline);border-radius:12px;padding:14px 16px;margin-bottom:14px}
  @media(max-width:760px){.sb-section:first-child .sb-scroll{max-height:calc(3 * 38px);overflow-y:auto}}
  .sb-section h3{font-size:.75rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:0 0 10px}
  .sb-link{display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:8px;text-decoration:none;font-size:.88rem;color:var(--body);transition:background .12s;line-height:1.3}
  .sb-link:hover,.sb-link.active{background:var(--p-light);color:var(--p);font-weight:600}
  .sb-link .sb-count{margin-left:auto;font-size:.72rem;color:var(--muted);background:#eee;border-radius:99px;padding:1px 7px;flex-shrink:0}
  .sb-link.active .sb-count{background:rgba(24,103,73,.15);color:var(--p)}
  .sb-scroll{max-height:260px;overflow-y:auto;scrollbar-width:thin}
  .price-chips{display:flex;flex-direction:column;gap:6px}
  .p-chip{background:#fff;border:1px solid var(--hairline);border-radius:8px;padding:7px 10px;font-size:.85rem;cursor:pointer;transition:all .12s;text-align:left;font-family:inherit;color:var(--body);width:100%}
  .p-chip:hover,.p-chip.active{background:var(--p-light);border-color:var(--p);color:var(--p);font-weight:600}
  .cards-empty{display:none;padding:32px 0;text-align:center;color:var(--muted);font-size:.95rem}

  /* Grid & cards — grille 2 colonnes fixes dans le contexte sidebar */
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
  @media(max-width:500px){.grid{grid-template-columns:1fr}}
  .card{background:#fff;border:1px solid var(--hairline);border-radius:var(--radius);padding:18px;transition:box-shadow .18s,border-color .18s;display:flex;flex-direction:column;gap:6px;min-width:0;min-height:200px}
  .card:hover{box-shadow:0 4px 20px rgba(0,0,0,.09);border-color:#ccc}
  .card-emoji{font-size:1.8rem;line-height:1;margin-bottom:4px}
  .card .t{font-weight:700;font-size:1rem;display:block;color:var(--ink);text-decoration:none;line-height:1.35}
  .card .t:hover{color:var(--p)}
  .card-org{color:var(--muted);font-size:.85rem;font-weight:500}
  .card-info{color:var(--muted);font-size:.8rem}
  .card-price{color:var(--muted);font-size:.8rem;font-weight:400;margin-top:2px}
  .card-cta{display:block;background:var(--p);color:#fff;font-weight:700;font-size:.95rem;border-radius:10px;padding:13px 16px;text-decoration:none;text-align:center;margin-top:auto;transition:background .15s}
  .card-cta:hover{background:var(--p-active)}
  .badge{display:inline-block;font-size:.72rem;font-weight:700;background:var(--p-light);color:var(--p);border-radius:99px;padding:3px 10px}

  /* Muted helper */
  .muted{color:var(--muted);font-size:.88rem}

  /* Chips / maillage */
  .mesh{margin:32px 0} .mesh h2{margin-bottom:12px}
  .chips{display:flex;flex-wrap:wrap;gap:8px}
  .chip{background:var(--surface);border:1px solid var(--hairline);border-radius:99px;padding:7px 14px;text-decoration:none;font-size:.88rem;color:var(--body);transition:background .12s,border-color .12s}
  .chip:hover{background:var(--p-light);border-color:var(--p);color:var(--p)}

  /* CTA page-level */
  .cta{display:inline-block;background:var(--p);color:#fff;font-weight:700;border-radius:10px;padding:12px 24px;text-decoration:none;margin:8px 0 24px;font-size:1rem;transition:background .15s}
  .cta:hover{background:var(--p-active)}

  /* Misc */
  .mesh ul{margin:.4rem 0 0 1.1rem} .mesh li{margin:.3rem 0}
  .article{line-height:1.75;color:var(--body)}
  .article h2{font-size:1.25rem;color:var(--ink);margin:1.8rem 0 .5rem;font-weight:700}
  .article h3{font-size:1.05rem;color:var(--ink);margin:1.2rem 0 .4rem;font-weight:700}
  .article p{margin:.75rem 0} .article ul,.article ol{margin:.6rem 0 .6rem 1.2rem} .article li{margin:.3rem 0}
  .article a{color:var(--p)} .article strong{color:var(--ink)}
  .article table{border-collapse:collapse;width:100%;margin:1rem 0;font-size:.92rem}
  .article th,.article td{border:1px solid var(--hairline);padding:9px 12px;text-align:left}
  .article th{background:var(--surface);font-weight:700}
  /* City cards */
  .city-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:24px 0}
  @media(max-width:640px){.city-grid{grid-template-columns:repeat(2,1fr);gap:12px}}
  .city-card{border-radius:16px;overflow:hidden;text-decoration:none;display:flex;flex-direction:column;justify-content:flex-end;min-height:150px;padding:16px;position:relative;transition:transform .2s,box-shadow .2s;background-size:cover;background-position:center}
  .city-card:hover{transform:translateY(-4px);box-shadow:0 16px 40px rgba(0,0,0,.22)}
  .city-card::before{content:'';position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.6) 0%,rgba(0,0,0,.05) 60%);border-radius:inherit}
  .city-card-em{font-size:2rem;position:absolute;top:14px;left:16px;z-index:1}
  .city-card-name{color:#fff;font-weight:800;font-size:1.1rem;position:relative;z-index:1;text-shadow:0 1px 4px rgba(0,0,0,.4)}
  .city-card-meta{color:rgba(255,255,255,.82);font-size:.78rem;position:relative;z-index:1;font-weight:500}
  .city-card-count{display:inline-block;background:rgba(255,255,255,.2);border-radius:99px;padding:2px 8px;font-size:.72rem;font-weight:700;color:#fff;position:relative;z-index:1;margin-top:4px;backdrop-filter:blur(4px)}

  /* City search in hero */
  .city-search-wrap{position:relative;max-width:560px;margin-top:10px}
  .city-search-wrap input{width:100%;padding:12px 52px 12px 40px;border:none;border-radius:12px;font-size:.95rem;font-family:inherit;outline:none;background:rgba(255,255,255,.92);color:var(--ink)}
  .city-search-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:1rem;pointer-events:none}
  .city-search-wrap input::placeholder{color:#aaa}

  /* Region filter */
  .region-filter{display:flex;flex-wrap:wrap;gap:8px;margin:20px 0 12px}
  .reg-btn{background:#fff;border:1px solid var(--hairline);border-radius:99px;padding:7px 14px;font-size:.85rem;cursor:pointer;font-family:inherit;color:var(--body);transition:all .12s}
  .reg-btn:hover,.reg-btn.active{background:var(--p-light);border-color:var(--p);color:var(--p);font-weight:600}

  /* Stats band */
  .stats-band{background:var(--p-light);border-radius:14px;padding:20px 24px;display:flex;flex-wrap:wrap;gap:24px;justify-content:center;margin:32px 0;text-align:center}
  .stat-item .n{font-size:1.8rem;font-weight:800;color:var(--p);line-height:1}
  .stat-item .l{font-size:.82rem;color:var(--muted);margin-top:3px}

  /* Section separator */
  .section-label{display:flex;align-items:center;gap:10px;margin:36px 0 18px}
  .section-label h2{margin:0;font-size:1.25rem;font-weight:800}
  .section-label-line{flex:1;height:1px;background:var(--hairline)}

  /* Cat nav strip in hero */
  .cat-nav{display:flex;gap:8px;flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px;margin-top:20px;-webkit-overflow-scrolling:touch;scrollbar-width:none}
  .cat-nav::-webkit-scrollbar{display:none}
  .cat-nav a{flex-shrink:0;display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);border-radius:99px;padding:7px 14px;text-decoration:none;color:#fff;font-size:.85rem;font-weight:600;white-space:nowrap;transition:background .15s}
  .cat-nav a:hover{background:rgba(255,255,255,.28)}
  @media(max-width:600px){.cat-nav{flex-wrap:wrap;overflow-x:visible;padding-bottom:0}}
  @media(max-width:600px){.cat-nav a{flex:0 0 auto;font-size:.8rem;padding:8px 10px}}
  @media(max-width:600px){.cat-nav a:nth-child(-n+3){flex:1 1 calc(33.333% - 8px);justify-content:center}}

  /* Benefits bar */
  .benefits{display:flex;flex-wrap:wrap;gap:16px;margin-top:18px;font-size:.88rem;color:rgba(255,255,255,.9)}
  .benefits span{display:flex;align-items:center;gap:6px}
  .benefits .chk{background:rgba(255,255,255,.25);border-radius:50%;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:800}

  /* Card cat line (emoji + badge inline) */
  .card-cat-line{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px}
  .card-cat-line .em{font-size:1.4rem;line-height:1}

  /* Back button */
  .back-btn{display:inline-flex;align-items:center;gap:6px;color:var(--p);text-decoration:none;font-size:.9rem;font-weight:600;margin-bottom:16px;padding:7px 14px;background:var(--p-light);border-radius:8px;transition:background .12s}
  .back-btn:hover{background:#d4eddf}

  /* Footer pro */
  footer{border-top:2px solid var(--hairline);background:#1a2e25;color:#a8c4b4;margin-top:56px;font-size:.88rem}
  footer a{color:#a8c4b4;text-decoration:none;transition:color .12s} footer a:hover{color:#fff}
  .footer-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:32px;padding:40px 0 32px}
  @media(max-width:640px){.footer-grid{grid-template-columns:1fr 1fr;gap:24px;padding:32px 0 24px}}
  .footer-brand{color:#fff;font-weight:800;font-size:1.05rem;margin:0 0 8px;display:block}
  .footer-desc{font-size:.82rem;line-height:1.6;margin:0 0 16px}
  .footer-col h4{color:#fff;font-size:.82rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin:0 0 12px}
  .footer-col ul{margin:0;padding:0;list-style:none}
  .footer-col li{margin:0 0 8px}
  .footer-bottom{border-top:1px solid rgba(255,255,255,.1);padding:16px 0;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;font-size:.8rem}
</style>
</head>
<body>
<header><div class="wrap">
  <a href="/formations" style="text-decoration:none;flex-shrink:0;display:flex;align-items:center">
    <img src="/images/logo-header.png" alt="Formation Santé Bien-être" style="height:36px;width:auto;display:block">
  </a>
  <nav class="header-nav">
    <a href="/formations">Formations</a>
    <a href="/metiers" class="hide-mobile">Métiers</a>
    <a href="/villes">Villes</a>
    <a href="/blog" class="hide-mobile">Blog</a>
    <a href="/financement-cpf" class="hide-mobile">Financement CPF</a>
    <a href="/faq" class="hide-mobile">FAQ</a>
  </nav>
</div></header>
${o.hero ? `<section class="hero"><div class="wrap">${o.hero}</div></section>` : ""}
<main class="wrap">
<nav class="crumb">${o.breadcrumb
    .map((b, i) => (b.url && i < o.breadcrumb.length - 1 ? `<a href="${esc(b.url)}">${esc(b.name)}</a>` : esc(b.name)))
    .join(" › ")}</nav>
${o.body}
</main>
<footer><div class="wrap">
  <div class="footer-grid">
    <div>
      <span class="footer-brand">🌿 Formation Santé Bien-être</span>
      <p class="footer-desc">Comparateur de formations CPF en esthétique, massage bien-être, coiffure et soins. Toutes nos formations sont éligibles au CPF et proposées par des organismes certifiés Qualiopi.</p>
      <p style="margin:0;font-size:.8rem">Données issues du catalogue public Mon Compte Formation (Caisse des Dépôts).</p>
    </div>
    <div class="footer-col">
      <h4>Formations</h4>
      <ul>
        <li><a href="/formations/esthetique-soin-corporel">Esthétique</a></li>
        <li><a href="/formations/massage-bien-etre">Massage bien-être</a></li>
        <li><a href="/formations/coiffure">Coiffure</a></li>
        <li><a href="/formations/maquillage">Maquillage</a></li>
        <li><a href="/formations/manucurie">Manucure</a></li>
        <li><a href="/formations">Toutes les formations →</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Guides</h4>
      <ul>
        <li><a href="/financement-cpf">Financement CPF</a></li>
        <li><a href="/faq">FAQ</a></li>
        <li><a href="/metiers">Fiches métiers</a></li>
        <li><a href="/blog">Blog &amp; conseils</a></li>
        <li><a href="/villes">Formations par ville</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Informations</h4>
      <ul>
        <li><a href="/mentions-legales">Mentions légales</a></li>
        <li><a href="/politique-confidentialite">Politique de confidentialité</a></li>
        <li><a href="mailto:contact@ecole-naturo.fr">Contact</a></li>
      </ul>
    </div>
  </div>
  <div class="footer-bottom">
    <span>© ${new Date().getFullYear()} Formation Santé Bien-être — Édité par École de Naturopathie et Sophrologie (SAS), Paris 1<sup>er</sup></span>
    <span><a href="/mentions-legales">Mentions légales</a> · <a href="/politique-confidentialite">Confidentialité</a></span>
  </div>
</div></footer>
</body>
</html>`;
}

// Normalise les noms de catégories pour l'affichage (sans toucher aux slugs/URLs)
function normCat(s: string): string {
  return s.replace(/manucurie/gi, (m) => (m[0] === "M" ? "Manucure" : "manucure"));
}

function categoryEmoji(nom: string): string {
  const s = (nom ?? "").toLowerCase();
  if (s.includes("manucur") || s.includes("ongl")) return "💅";
  if (s.includes("maquillage spectacle")) return "🎭";
  if (s.includes("maquillage")) return "💄";
  if (s.includes("coiffure") || s.includes("spécialisation coiffure")) return "✂️";
  if (s.includes("massage bien-être") || s.includes("massage bien-etre")) return "🤲";
  if (s.includes("massage esthétique") || s.includes("massage esth")) return "🤲";
  if (s.includes("massage")) return "🤲";
  if (s.includes("esthétique") || s.includes("soin corpor")) return "💆";
  if (s.includes("thalasso") || s.includes("thermal")) return "🌊";
  if (s.includes("valorisation") || s.includes("image de soi")) return "✨";
  if (s.includes("hygiène") || s.includes("hygiene")) return "🧼";
  if (s.includes("art corpor")) return "🎨";
  if (s.includes("thanato")) return "🕯️";
  if (s.includes("secrétariat") || s.includes("assistanat")) return "📋";
  if (s.includes("commercial")) return "📊";
  if (s.includes("communication")) return "💼";
  return "🌿";
}

function urgencyBadge(index: number, total: number): string {
  if (index >= Math.ceil(total * 0.3)) return "";
  // Rare seat-count badges appear only every 10th eligible card
  const rare = index % 10 === 9;
  if (rare) {
    const seats = [3, 4, 5, 6][index % 4];
    return `<span class="urgency-badge urgency-limited">⚡ ${seats} places disponibles</span>`;
  }
  const badges = [
    `<span class="urgency-badge urgency-limited">⚡ Places limitées</span>`,
    `<span class="urgency-badge urgency-spots">🎯 Forte demande ce mois-ci</span>`,
    `<span class="urgency-badge urgency-last">🔥 Très demandée</span>`,
  ];
  return badges[index % badges.length];
}

function formationCards(items: any[]): string {
  if (!items.length) return `<p class="muted">Aucune formation disponible pour ce critère pour le moment.</p>`;
  return `<div class="grid">${items
    .map(
      (f, i) => `<div class="card" data-price="${f.prix_min ?? 0}">
<div class="card-cat-line"><span class="em">${categoryEmoji(f.categorie_nom ?? "")}</span>${f.categorie_nom ? `<span class="badge">${esc(normCat(f.categorie_nom))}</span>` : ""}${urgencyBadge(i, items.length)}</div>
<a class="t" href="/#/formation/${encodeURIComponent(f.numero_formation)}" style="font-size:1.02rem">${esc(f.intitule)}</a>
<span class="card-org" style="font-weight:600;color:var(--body)">${esc(f.organisme ?? "")}</span>
<span class="card-info">${f.a_distance ? "🌐 À distance possible" : "📍 Présentiel"}${f.type_referentiel ? " &middot; " + esc(f.type_referentiel) : ""} &middot; ✅ CPF${f.organisme_qualiopi ? " &middot; <strong>Qualiopi</strong>" : ""}</span>
<span class="card-price">${eur(f.prix_min)}</span>
<a class="card-cta" href="/#/formation/${encodeURIComponent(f.numero_formation)}">Je m'informe gratuitement →</a>
</div>`
    )
    .join("")}</div>`;
}

// JS client-side price filter injected once per page with cards
const PRICE_FILTER_JS = `<script>
(function(){
  var chips=document.querySelectorAll('.p-chip');
  var grid=document.getElementById('cards-grid');
  var empty=document.getElementById('cards-empty');
  if(!grid)return;
  var maxPrice=Infinity;
  function applyFilter(){
    var cards=grid.querySelectorAll('.card');
    var visible=0;
    cards.forEach(function(c){
      var p=parseFloat(c.dataset.price)||0;
      var show=p<=maxPrice||(p===0&&maxPrice===Infinity);
      c.style.display=show?'':'none';
      if(show)visible++;
    });
    if(empty)empty.style.display=visible===0?'block':'none';
  }
  chips.forEach(function(btn){
    btn.addEventListener('click',function(){
      chips.forEach(function(b){b.classList.remove('active');});
      btn.classList.add('active');
      maxPrice=btn.dataset.max===''?Infinity:parseFloat(btn.dataset.max);
      applyFilter();
    });
  });
})();
</script>`;

interface SidebarOpts {
  currentCatSlug?: string;
  currentDeptSlug?: string;
  allCats: { slug: string; nom: string; n: number }[];
  depts?: { code: string; nom: string; slug: string; n: number }[];
  deptLinkBase?: string; // e.g. "/formations/massage-bien-etre"
}

function buildSidebar(o: SidebarOpts): string {
  const catSection = `<div class="sb-section">
  <h3>Par métier</h3>
  <div class="sb-scroll">
    ${o.allCats
      .filter((c) => c.slug !== "maquillage-spectacle")
      .map((c) => {
        const active = c.slug === o.currentCatSlug;
        return `<a class="sb-link${active ? " active" : ""}" href="/formations/${c.slug}">
          <span>${categoryEmoji(c.nom)} ${esc(normCat(c.nom))}</span>
          <span class="sb-count">${c.n}</span>
        </a>`;
      })
      .join("")}
  </div>
</div>`;

  const deptSection =
    o.depts && o.depts.length > 0
      ? `<div class="sb-section">
  <h3>Par département</h3>
  <div class="sb-scroll">
    ${o.depts
      .slice(0, 30)
      .map((d) => {
        const active = d.slug === o.currentDeptSlug;
        const href = o.deptLinkBase ? `${o.deptLinkBase}/${d.slug}` : `/formations/${o.currentCatSlug ?? ""}/${d.slug}`;
        return `<a class="sb-link${active ? " active" : ""}" href="${esc(href)}">
          <span>📍 ${esc(d.nom)}</span>
          <span class="sb-count">${d.n}</span>
        </a>`;
      })
      .join("")}
  </div>
</div>`
      : "";

  const priceSection = `<div class="sb-section">
  <h3>Budget maximum</h3>
  <div class="price-chips">
    <button class="p-chip active" data-max="">Tous les budgets</button>
    <button class="p-chip" data-max="500">Jusqu'à 500 €</button>
    <button class="p-chip" data-max="1000">Jusqu'à 1 000 €</button>
    <button class="p-chip" data-max="2000">Jusqu'à 2 000 €</button>
    <button class="p-chip" data-max="3000">Jusqu'à 3 000 €</button>
  </div>
</div>`;

  return catSection + deptSection + priceSection;
}

function withSidebar(sidebar: string, content: string): string {
  return `<button class="filter-toggle-btn" onclick="var s=document.getElementById('mob-sidebar');s.classList.toggle('open');this.innerHTML=s.classList.contains('open')?'✕ Masquer les filtres':'⚙️ Filtres'">⚙️ Filtres</button>
<div class="page-layout">
  <aside class="sidebar" id="mob-sidebar">${sidebar}</aside>
  <div>
    <div id="cards-grid">${content}</div>
    <p class="cards-empty" id="cards-empty">Aucune formation ne correspond à ce budget. <button class="p-chip active" data-max="" style="display:inline;width:auto;padding:4px 10px" onclick="document.querySelectorAll('.p-chip').forEach(function(b){b.classList.remove('active')});this.classList.add('active');document.querySelectorAll('.card').forEach(function(c){c.style.display=''});document.getElementById('cards-empty').style.display='none'">Réinitialiser</button></p>
  </div>
</div>${PRICE_FILTER_JS}`;
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
        url: `${canonical}`,
        inLanguage: "fr",
        ...(f.organisme ? { provider: { "@type": "Organization", name: f.organisme } } : {}),
        ...(f.prix_min != null ? {
          offers: {
            "@type": "Offer",
            price: f.prix_min,
            priceCurrency: "EUR",
          }
        } : {}),
        ...(f.a_distance !== undefined ? { courseMode: f.a_distance ? "online" : "onsite" } : {}),
        ...(f.organisme_qualiopi ? { hasCourseInstance: { "@type": "CourseInstance", courseMode: "blended" } } : {}),
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

// ---------- constantes villes ----------
const TOP_CITIES = [
  { slug: "paris",     name: "Paris",     emoji: "🗼", gradient: "linear-gradient(145deg,#1565c0,#0d47a1)", region: "Île-de-France",             photo: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80&fit=crop" },
  { slug: "lyon",      name: "Lyon",      emoji: "🏛️",  gradient: "linear-gradient(145deg,#6a1b9a,#4a148c)", region: "Auvergne-Rhône-Alpes",      photo: "https://images.pexels.com/photos/16632277/pexels-photo-16632277.jpeg?auto=compress&cs=tinysrgb&w=600" },
  { slug: "marseille", name: "Marseille", emoji: "⛵",  gradient: "linear-gradient(145deg,#0277bd,#005b7a)", region: "Provence-Alpes-Côte d'Azur", photo: "https://images.pexels.com/photos/34059360/pexels-photo-34059360.jpeg?auto=compress&cs=tinysrgb&w=600" },
  { slug: "bordeaux",  name: "Bordeaux",  emoji: "🍷",  gradient: "linear-gradient(145deg,#880e4f,#560027)", region: "Nouvelle-Aquitaine",          photo: "https://images.pexels.com/photos/34575336/pexels-photo-34575336.jpeg?auto=compress&cs=tinysrgb&w=600" },
  { slug: "toulouse",  name: "Toulouse",  emoji: "🌸",  gradient: "linear-gradient(145deg,#c62828,#8d1111)", region: "Occitanie",                   photo: "https://images.pexels.com/photos/30753243/pexels-photo-30753243.jpeg?auto=compress&cs=tinysrgb&w=600" },
  { slug: "nice",      name: "Nice",      emoji: "☀️",  gradient: "linear-gradient(145deg,#006994,#00485f)", region: "Côte d'Azur",                 photo: "https://images.pexels.com/photos/30438481/pexels-photo-30438481.jpeg?auto=compress&cs=tinysrgb&w=600" },
] as const;

const REGION_MAP: Record<string, string[]> = {
  "Île-de-France":             ["paris","paris-04","versailles","boulogne-billancourt","nanterre","creteil","montreuil","montrouge","argenteuil","saint-denis","ivry-sur-seine","vitry-sur-seine","colombes","vincennes","noisiel","rueil-malmaison","saint-maur-des-fosses","goussainville","levallois-perret","le-plessis-robinson","brunoy","villemomble","thiais","nangis","neuilly-plaisance","meudon","lieusaint","les-chapelles-bourbon","le-chesnay-rocquencourt","fontainebleau","mery-sur-oise","meaux","epinay-sur-orge","corbeil-essonnes","saint-mande","nanteuil-les-meaux","saint-mammes","aubervilliers","rosny-sous-bois","neuilly-sur-marne","chelles","aulnay-sous-bois"],
  "Auvergne-Rhône-Alpes":      ["lyon","grenoble","clermont-ferrand","saint-etienne","villeurbanne","annecy","chambery","valence","albertville","annemasse","bourg-en-bresse","roanne","thonon-les-bains","oyonnax","prevessin-moens","meyzieu","bourgoin-jallieu","pont-du-chateau","charnoz-sur-ain","brives-charensac","brignais","montelimar","vienne","venissieux","la-motte-servolex","bourg-les-valence"],
  "Provence-Alpes-Côte d'Azur":["marseille","nice","toulon","aix-en-provence","avignon","antibes","cannes","salon-de-provence","gap","arles","aubagne","martigues","six-fours-les-plages","perols","la-seyne-sur-mer","sorgues","saint-victoret","la-valette-du-var","mandelieu-la-napoule","saint-cyr-sur-mer","mougins","grasse","cavaillon","carros","brignoles","senas","saint-raphael","piolenc","ollioules","les-pennes-mirabeau","istres","mandelieu-la-napoule"],
  "Occitanie":                 ["toulouse","montpellier","nimes","perpignan","beziers","narbonne","castres","albi","rodez","carcassonne","sete","lunel","clarensac","rabastens-de-bigorre","saint-esteve","pollestres","mejannes-les-ales","saint-jean-de-vedas","les-angles","gourdan-polignan","colomiers","castanet-tolosan","balma","argeles-sur-mer","saint-christol-lez-ales","lattes","gallargues-le-montueux","verfeil","mauguio","st-jean"],
  "Nouvelle-Aquitaine":        ["bordeaux","limoges","poitiers","pau","angouleme","brive-la-gaillarde","la-rochelle","perigueux","agen","bayonne","mont-de-marsan","saintes","floirac","chasseneuil-du-poitou","jaunay-marigny","fronsac","bergerac","villenave-d-ornon","tulle","gradignan","dax","biganos","begles","bruges","arcangues"],
  "Grand Est":                 ["strasbourg","metz","reims","mulhouse","nancy","colmar","charleville-mezieres","troyes","epinal","thionville","forbach","schiltigheim","saint-louis","gertwiller","terville","sedan","riedisheim","mundolsheim","rixheim","oberhoffen-sur-moder","hagondange"],
  "Hauts-de-France":           ["lille","amiens","roubaix","tourcoing","dunkerque","calais","valenciennes","lens","saint-quentin","arras","villeneuve-d-ascq","halluin","lumbres","croix","cambrai","maubeuge","marcq-en-bar-ul","henin-beaumont","compiegne","capinghem","armentieres"],
  "Bretagne":                  ["rennes","brest","quimper","lorient","vannes","saint-brieuc","lannion","morlaix"],
  "Pays de la Loire":          ["nantes","le-mans","angers","saint-nazaire","la-roche-sur-yon","laval","cholet","saumur","oudon","vertou","trelaze","treize-septiers","saint-herblain","reze"],
  "Normandie":                 ["rouen","caen","le-havre","cherbourg-en-cotentin","evreux","dieppe","mont-saint-aignan","alencon"],
  "Centre-Val de Loire":       ["orleans","tours","blois","chartres","bourges","chateauroux","vierzon","montoire-sur-le-loir","cloyes-les-trois-rivieres"],
  "Bourgogne-Franche-Comté":   ["dijon","besancon","belfort","chalon-sur-saone","auxerre","macon","lons-le-saunier","fontaine-les-dijon","montceau-les-mines"],
  "Outre-Mer":                 ["le-lamentin","les-abymes"],
};

function cityRegion(slug: string): string {
  for (const [region, slugs] of Object.entries(REGION_MAP)) {
    if (slugs.includes(slug)) return region;
  }
  return "Autres";
}

// ---------- robots & sitemap ----------
seoRouter.get("/robots.txt", (req, res) => {
  res.type("text/plain").send(`User-agent: *\nAllow: /\nSitemap: ${baseUrl(req)}/sitemap.xml\n`);
});

// Liste de toutes les URLs indexables (sitemap + IndexNow).
// Les pages légales sont exclues : elles ne génèrent pas de trafic SEO et diluent le PageRank.
export function allIndexableUrls(base: string): string[] {
  const cats = listCategories() as { slug: string; n: number }[];
  const dcode = deptByCode();
  const urls: string[] = [`${base}/formations`, `${base}/financement-cpf`, `${base}/faq`, `${base}/metiers`, `${base}/blog`];
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

function sitemapPriority(url: string): string {
  if (/\/formations$/.test(url)) return "1.0";
  if (/\/formations\/[^/]+$/.test(url)) return "0.9";
  if (/\/metier\//.test(url)) return "0.8";
  if (/\/blog$/.test(url) || /\/financement-cpf$/.test(url) || /\/faq$/.test(url)) return "0.8";
  if (/\/blog\//.test(url)) return "0.7";
  if (/\/ville\/[^/]+$/.test(url) || /\/villes$/.test(url)) return "0.6";
  return "0.5";
}

function sitemapChangefreq(url: string): string {
  if (/\/formations/.test(url) || /\/ville/.test(url)) return "weekly";
  if (/\/blog\//.test(url) || /\/metier\//.test(url)) return "monthly";
  return "weekly";
}

seoRouter.get("/sitemap.xml", (req, res) => {
  const base = baseUrl(req);
  const today = new Date().toISOString().split("T")[0];
  const articleDates = new Map(
    listArticles().map((a) => [`${base}/blog/${a.slug}`, a.updatedAt ?? a.publishedAt ?? today])
  );
  const urls = allIndexableUrls(base);
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${esc(u)}</loc><lastmod>${articleDates.get(u) ?? today}</lastmod><changefreq>${sitemapChangefreq(u)}</changefreq><priority>${sitemapPriority(u)}</priority></url>`).join("\n") +
    `\n</urlset>\n`;
  res.type("application/xml").send(xml);
});

// ---------- hub ----------
seoRouter.get("/formations", (req, res) => {
  const allCats = (listCategories() as { slug: string; nom: string; n: number }[]).filter((c) => c.n > 0);
  const HIDDEN_CAT_SLUGS = ["maquillage-spectacle","secretariat-assistanat-specialise","communication-professionnelle","action-commerciale"];
  const cats = allCats.filter((c) => !HIDDEN_CAT_SLUGS.includes(c.slug));
  const canonical = `${baseUrl(req)}/formations`;
  const stats = globalStats();
  const allVilles = seoVilles();
  const articles = listArticles().slice(0, 3);

  const catsJson = JSON.stringify(cats.map((c) => ({ slug: c.slug, nom: normCat(c.nom), n: c.n, emoji: categoryEmoji(c.nom) })));
  const villesJson = JSON.stringify(allVilles.map((v) => ({ slug: v.slug, ville: titleCaseVille(v.ville), n: v.n })));

  // chips fixes dans le hero (sous les coches)
  const heroChips = [
    { label: "🧖‍♀️ Esthétique", href: "/formations/esthetique-soin-corporel" },
    { label: "✂️ Coiffure",    href: "/formations/coiffure" },
    { label: "💅 Manucure",    href: "/formations/manucurie" },
    { label: "💆 Massage",     href: "/formations/massage-bien-etre" },
    { label: "💄 Maquillage",  href: "/formations/maquillage" },
  ];
  // 6 formations populaires (premières du catalogue général)
  const popularFormations = searchFormations({ pageSize: 6 }).items;

  // 6 city cards avec n réel depuis la DB
  const villeMap = new Map(allVilles.map((v) => [v.slug, v.n]));
  const cityCards = TOP_CITIES.map((city) => {
    const n = villeMap.get(city.slug) ?? 0;
    return `<a class="city-card" href="/ville/${city.slug}" style="background-image:url('${city.photo}'),${city.gradient}">
  <span class="city-card-em">${city.emoji}</span>
  <div>
    <div class="city-card-name">${esc(city.name)}</div>
    <div class="city-card-meta">${esc(city.region)}</div>
    ${n > 0 ? `<span class="city-card-count">${n} organisme${n > 1 ? "s" : ""}</span>` : ""}
  </div>
</a>`;
  }).join("");

  // Autres villes (hors top 6) avec data-region pour le filtre JS
  const otherVilles = allVilles.filter((v) => !TOP_CITIES.some((c) => c.slug === v.slug));
  const regionChips = otherVilles.map((v) =>
    `<a class="chip" href="/ville/${v.slug}" data-reg="${esc(cityRegion(v.slug))}" style="display:none">📌 ${esc(titleCaseVille(v.ville))} (${v.n})</a>`
  ).join("");
  const allRegions = [...new Set(otherVilles.map((v) => cityRegion(v.slug)))].sort();

  const hero = `<h1 style="color:#fff">2&nbsp;086 formations santé et bien-être éligibles au CPF</h1>
<p class="sub">Trouvez gratuitement la meilleure formation près de chez vous</p>
<div class="search-wrap" id="sw">
  <input type="text" id="hero-q" placeholder="Ex : massage, esthétique, coiffure…" autocomplete="off" aria-label="Rechercher une formation">
  <button class="search-btn" id="search-submit-btn" type="button">🔍 Rechercher</button>
  <div class="search-dropdown" id="sd" role="listbox" aria-label="Suggestions de métiers"></div>
</div>
<div class="city-search-wrap" id="csw">
  <span class="city-search-icon">📍</span>
  <input type="text" id="city-q" placeholder="Ou cherchez par ville (Paris, Lyon…)" autocomplete="off" aria-label="Rechercher par ville">
  <div class="search-dropdown" id="csd" role="listbox" aria-label="Suggestions de villes"></div>
</div>
<div class="benefits">
  <span><span class="chk">✓</span> Comparez en quelques secondes</span>
  <span><span class="chk">✓</span> 100&nbsp;% finançable CPF</span>
  <span><span class="chk">✓</span> Gratuit et sans engagement</span>
</div>
<nav class="cat-nav" aria-label="Recherches fréquentes">
${heroChips.map((c) => `<a href="${c.href}">${esc(c.label)}</a>`).join("")}
</nav>
<script>
(function(){
  var cats=${catsJson};
  var villes=${villesJson};
  // Formation search
  var inp=document.getElementById('hero-q'),sd=document.getElementById('sd');
  function renderCats(list){sd.innerHTML=list.map(function(c){return'<a class="sd-item" href="/formations/'+c.slug+'" role="option"><span class="em">'+c.emoji+'</span><span class="sdn">'+c.nom+'</span><span class="sdc">'+c.n+' formations</span></a>';}).join('');}
  inp.addEventListener('focus',function(){renderCats(cats);sd.classList.add('open');});
  inp.addEventListener('input',function(){var q=inp.value.toLowerCase().trim();renderCats(q?cats.filter(function(c){return c.nom.toLowerCase().includes(q);}):cats);sd.classList.add('open');});
  inp.addEventListener('keydown',function(e){if(e.key==='Enter'){var q=inp.value.trim();window.location.href=q?'/#/recherche/'+encodeURIComponent(q):'/#/recherche';}});
  document.getElementById('search-submit-btn').addEventListener('click',function(){renderCats(cats);sd.classList.add('open');inp.focus();});
  // City search
  var cinp=document.getElementById('city-q'),csd=document.getElementById('csd');
  function renderVilles(list){csd.innerHTML=list.slice(0,8).map(function(v){return'<a class="sd-item" href="/ville/'+v.slug+'" role="option"><span class="em">📍</span><span class="sdn">'+v.ville+'</span><span class="sdc">'+v.n+' organisme'+(v.n>1?'s':'')+'</span></a>';}).join('');}
  cinp.addEventListener('focus',function(){renderVilles(villes);csd.classList.add('open');});
  cinp.addEventListener('input',function(){var q=cinp.value.toLowerCase().trim();renderVilles(q?villes.filter(function(v){return v.ville.toLowerCase().includes(q);}):villes);csd.classList.add('open');});
  // Close on outside click
  document.addEventListener('click',function(e){
    if(!document.getElementById('sw').contains(e.target))sd.classList.remove('open');
    if(!document.getElementById('csw').contains(e.target))csd.classList.remove('open');
  });
})();
</script>`;

  const body = `
<div class="city-grid">${cityCards}</div>
<div style="margin-top:16px">
  <div class="region-filter" id="reg-filter">
    <button class="reg-btn" data-reg="all" onclick="filterReg(this,'all')">🗺️ Toutes les régions</button>
    ${allRegions.map((r) => `<button class="reg-btn" data-reg="${esc(r)}" onclick="filterReg(this,'${esc(r)}')">${esc(r)}</button>`).join("")}
  </div>
  <div class="chips" id="other-villes">${regionChips}</div>
</div>
<script>
function filterReg(btn,reg){
  document.querySelectorAll('.reg-btn').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  document.querySelectorAll('#other-villes .chip').forEach(function(c){
    c.style.display=(reg==='all'||c.dataset.reg===reg)?'':'none';
  });
}
</script>

<div class="section-label"><h2>🔥 Formations populaires</h2><span class="section-label-line"></span></div>
<div class="grid">
${popularFormations.map((f: any, i: number) => `<div class="card pop-card" data-price="${f.prix_min ?? 0}">
<div class="card-cat-line"><span class="em">${categoryEmoji(f.categorie_nom ?? "")}</span>${f.categorie_nom ? `<span class="badge">${esc(normCat(f.categorie_nom))}</span>` : ""}${urgencyBadge(i, popularFormations.length)}</div>
<a class="t" href="/#/formation/${encodeURIComponent(f.numero_formation)}">${esc(f.intitule)}</a>
<span class="card-org">${esc(f.organisme ?? "")}</span>
<span class="card-info">${f.a_distance ? "🌐 À distance" : "📍 Présentiel"} &middot; ✅ CPF${f.organisme_qualiopi ? " &middot; <strong>Qualiopi</strong>" : ""}</span>
<span class="card-price">${eur(f.prix_min)}</span>
<a class="card-cta" href="/#/formation/${encodeURIComponent(f.numero_formation)}">Je m'informe gratuitement →</a>
</div>`).join("")}
</div>

<div class="section-label"><h2>🎯 Parcourir par métier</h2><span class="section-label-line"></span></div>
<div class="metier-grid">
${listMetiers().map((m) => {
  const METIER_EMOJI: Record<string,string> = {"coiffure":"✂️","esthetique-soin-corporel":"🧖‍♀️","manucurie":"💅","maquillage":"💄","massage-bien-etre":"💆‍♀️","specialisation-coiffure":"🎨"};
  const METIER_COLOR: Record<string,string> = {"coiffure":"#f0fdf4","esthetique-soin-corporel":"#fdf4ff","manucurie":"#fff7ed","maquillage":"#fdf2f8","massage-bien-etre":"#f0f9ff","specialisation-coiffure":"#fefce8"};
  return `<a class="metier-tile" href="/metier/${m.slug}" style="background:${METIER_COLOR[m.slug]??'#f0fdf4'}">
  <span class="mt-em">${METIER_EMOJI[m.slug]??'✨'}</span>
  <span class="mt-name">${esc(m.metier)}</span>
  <span class="mt-cta">Voir les formations →</span>
</a>`;}).join("")}
</div>

<div class="section-label"><h2>📖 Conseils &amp; guides</h2><span class="section-label-line"></span></div>
<div class="grid">
<div class="card"><div class="card-cat-line"><span class="em">💰</span><span class="badge">Financement</span></div><a class="t" href="/financement-cpf">Comment financer sa formation avec le CPF ?</a><p class="card-org">Guide complet — éligibilité, démarches, jusqu'à 100 % pris en charge</p><a class="card-cta" href="/financement-cpf">Lire le guide</a></div>
<div class="card"><div class="card-cat-line"><span class="em">🎯</span><span class="badge">Métiers</span></div><a class="t" href="/metiers">Quel métier de la beauté vous correspond ?</a><p class="card-org">Missions, salaires, débouchés — toutes les fiches métier</p><a class="card-cta" href="/metiers">Découvrir les métiers</a></div>
${articles.map((a) => `<div class="card"><div class="card-cat-line"><span class="em">📝</span><span class="badge">Blog</span></div><a class="t" href="/blog/${a.slug}">${esc(a.title)}</a><p class="card-org">${esc(a.excerpt)}</p><a class="card-cta" href="/blog/${a.slug}">Lire l'article</a></div>`).join("")}
<div class="card" style="border:2px dashed var(--hairline);background:var(--surface);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px;min-height:200px">
  <span style="font-size:2.2rem">📖</span>
  <a class="t" href="/blog" style="font-size:1.05rem">Voir tous les articles</a>
  <p class="card-org">Guides, conseils métier, financements &amp; salaires</p>
  <a class="card-cta" href="/blog">Explorer le blog →</a>
</div>
</div>

<div class="section-label" style="margin-top:48px"><h2>❓ Les 10 questions les plus posées</h2><span class="section-label-line"></span></div>
<div class="mesh" style="padding:0">
<ol style="margin:0;padding:0 0 0 20px;display:flex;flex-direction:column;gap:0">
  <li style="padding:16px 20px 16px 4px;border-bottom:1px solid var(--hairline)"><strong><a href="/faq#faq-1" style="color:var(--body);text-decoration:none">Comment utiliser mon CPF pour une formation beauté ?</a></strong><br><span style="color:var(--muted);font-size:.9rem">Connectez-vous sur moncompteformation.gouv.fr, choisissez votre formation certifiée Qualiopi et mobilisez vos droits en quelques clics.</span></li>
  <li style="padding:16px 20px 16px 4px;border-bottom:1px solid var(--hairline)"><strong><a href="/faq#faq-2" style="color:var(--body);text-decoration:none">Combien ai-je sur mon CPF ?</a></strong><br><span style="color:var(--muted);font-size:.9rem">Vous cumulez 500 € par an travaillé, plafonné à 5 000 €. Consultez votre solde sur moncompteformation.gouv.fr ou appelez le 3699 (gratuit).</span></li>
  <li style="padding:16px 20px 16px 4px;border-bottom:1px solid var(--hairline)"><strong><a href="/faq#faq-4" style="color:var(--body);text-decoration:none">Qu'est-ce que la certification Qualiopi ?</a></strong><br><span style="color:var(--muted);font-size:.9rem">C'est le label qualité obligatoire pour tout organisme souhaitant proposer des formations finançables par le CPF.</span></li>
  <li style="padding:16px 20px 16px 4px;border-bottom:1px solid var(--hairline)"><strong><a href="/faq#faq-5" style="color:var(--body);text-decoration:none">Quelle est la différence entre le CAP et le BP esthétique ?</a></strong><br><span style="color:var(--muted);font-size:.9rem">Le CAP est le diplôme d'entrée (2 ans). Le BP est supérieur, accessible après le CAP, et ouvre l'encadrement et la gestion de salon.</span></li>
  <li style="padding:16px 20px 16px 4px;border-bottom:1px solid var(--hairline)"><strong><a href="/faq#faq-6" style="color:var(--body);text-decoration:none">Peut-on se former à tout âge ?</a></strong><br><span style="color:var(--muted);font-size:.9rem">Oui, aucune limite d'âge. Le CPF est ouvert à tous les actifs, salariés comme demandeurs d'emploi, jusqu'à la retraite.</span></li>
  <li style="padding:16px 20px 16px 4px;border-bottom:1px solid var(--hairline)"><strong><a href="/faq#faq-3" style="color:var(--body);text-decoration:none">Mon CPF est insuffisant, que faire ?</a></strong><br><span style="color:var(--muted);font-size:.9rem">Votre OPCO, une aide régionale ou l'AIF de France Travail peuvent compléter votre CPF. Ces aides sont cumulables.</span></li>
  <li style="padding:16px 20px 16px 4px;border-bottom:1px solid var(--hairline)"><strong><a href="/faq#faq-16" style="color:var(--body);text-decoration:none">Combien gagne une esthéticienne en France ?</a></strong><br><span style="color:var(--muted);font-size:.9rem">Entre le SMIC (~1 400 € nets) en début de carrière et 2 500 € nets en libéral avec une clientèle fidélisée.</span></li>
  <li style="padding:16px 20px 16px 4px;border-bottom:1px solid var(--hairline)"><strong><a href="/faq#faq-7" style="color:var(--body);text-decoration:none">Les formations à distance sont-elles reconnues ?</a></strong><br><span style="color:var(--muted);font-size:.9rem">Oui si l'organisme est certifié Qualiopi et que la formation mène à un titre RNCP ou RS reconnu par l'État.</span></li>
  <li style="padding:16px 20px 16px 4px;border-bottom:1px solid var(--hairline)"><strong><a href="/faq#faq-17" style="color:var(--body);text-decoration:none">Quels débouchés après une formation massage bien-être ?</a></strong><br><span style="color:var(--muted);font-size:.9rem">Spa, hôtel, thalasso, libéral, yacht... La demande est forte dans les grandes villes et les zones touristiques.</span></li>
  <li style="padding:16px 20px 16px 4px"><strong><a href="/faq#faq-18" style="color:var(--body);text-decoration:none">Comment vérifier qu'une formation est éligible au CPF ?</a></strong><br><span style="color:var(--muted);font-size:.9rem">Rendez-vous sur moncompteformation.gouv.fr et tapez le nom de la formation. Seules les formations référencées sont finançables.</span></li>
</ol>
<div style="padding:20px;background:var(--p-light);border-top:1px solid var(--hairline);display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">
  <span style="font-size:.95rem;font-weight:600">Vous avez d'autres questions ?</span>
  <a class="cta" href="/faq" style="margin:0;padding:10px 24px;font-size:.9rem">Voir toutes les questions →</a>
</div>
</div>`;

  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Formation Santé Bien-être",
    url: canonical,
    description: "Comparateur de formations CPF en esthétique, massage bien-être, coiffure et soins.",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${canonical}?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };

  res.send(
    renderPage({
      title: "Formations santé & bien-être éligibles CPF | Formation Santé Bien-être",
      description: "Comparez les formations en esthétique, massage bien-être, coiffure et soins, financées par le CPF, par métier et par département.",
      canonical,
      jsonLd: [websiteLd],
      breadcrumb: [{ name: "Accueil", url: `${baseUrl(req)}/formations` }, { name: "Formations" }],
      hero,
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
  <a class="chip" href="/formations"><strong>${s.formations.toLocaleString("fr-FR")}</strong> formations CPF</a>
  <a class="chip" href="/formations"><strong>${s.organismes}</strong> organismes</a>
  <a class="chip" href="/formations"><strong>${s.qualiopi}</strong> certifiés Qualiopi</a>
</div>
<div class="mesh"><h2>Comment ça marche, en 3 étapes</h2>
  <p>1. <strong>Vérifiez vos droits</strong> sur moncompteformation.gouv.fr.<br>
     2. <strong>Choisissez votre formation</strong> certifiante (RNCP ou RS) dispensée par un organisme Qualiopi.<br>
     3. <strong>Mobilisez votre CPF</strong> ; un éventuel reste à charge peut être complété (Pôle emploi, employeur, fonds propres).</p>
</div>
<div class="mesh"><h2>Explorer les formations finançables</h2><div class="chips">
${cats.map((c) => `<a class="chip" href="/formations/${c.slug}">${esc(c.nom)} (${c.n})</a>`).join("")}
</div></div>
<a class="cta" href="/formations">Trouver ma formation CPF</a>`;

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
seoRouter.get("/mentions-legales", (req, res) => {
  const base = baseUrl(req);
  const body = `<h1>Mentions légales</h1>
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
  res.send(renderPage({ title: "Mentions légales | Formation Santé Bien-être", description: "Mentions légales du site formation-sante-bienetre.fr.", canonical: `${base}/mentions-legales`, noindex: true, breadcrumb: [{ name: "Accueil", url: `${base}/formations` }, { name: "Mentions légales" }], body }));
});

// ---------- FAQ ----------
seoRouter.get("/faq", (req, res) => {
  const base = baseUrl(req);
  const canonical = `${base}/faq`;
  const faqSections = [
    {
      titre: "💰 Financement CPF",
      id: "cpf",
      items: [
        { id: 1, q: "Comment utiliser mon CPF pour une formation beauté ?", a: "Connectez-vous sur <strong>moncompteformation.gouv.fr</strong> avec votre numéro de sécurité sociale. Recherchez la formation qui vous intéresse, vérifiez qu'elle est éligible au CPF et que l'organisme est certifié Qualiopi. Vous pouvez ensuite mobiliser vos droits directement depuis la plateforme. Si vous avez un reste à charge, l'employeur, France Travail ou une aide régionale peuvent compléter." },
        { id: 2, q: "Combien ai-je sur mon CPF ?", a: "Depuis 2019, vous cumulez <strong>500 € par an</strong> travaillé, plafonné à 5 000 € (800 € et 8 000 € pour les personnes peu qualifiées). Pour connaître votre solde exact, connectez-vous sur moncompteformation.gouv.fr ou appelez le 3699 (service gratuit)." },
        { id: 3, q: "Mon CPF est insuffisant pour couvrir la formation, que faire ?", a: "Depuis 2023, un reste à charge de 100 € minimum s'applique sauf si votre employeur prend en charge la formation. Pour couvrir ce qui reste, vous pouvez demander l'aide de votre OPCO, une aide de votre région, ou l'AIF de France Travail si vous êtes demandeur d'emploi. Ces aides sont cumulables avec le CPF." },
        { id: 4, q: "Comment vérifier qu'une formation est éligible au CPF ?", a: "Rendez-vous directement sur <strong>moncompteformation.gouv.fr</strong> et tapez le nom de la formation ou de l'organisme. Seules les formations référencées sur cette plateforme sont finançables par le CPF. Si vous ne trouvez pas la formation via la recherche, elle n'est pas éligible au CPF actuellement." },
        { id: 5, q: "Est-ce que les demandeurs d'emploi peuvent utiliser leur CPF ?", a: "Oui. En tant que demandeur d'emploi, vous cumulez votre CPF à hauteur de <strong>500 € par an</strong>. France Travail peut également financer une formation complémentaire via l'<strong>AIF (Aide Individuelle à la Formation)</strong> si la formation est validée dans votre projet professionnel." },
        { id: 6, q: "Comment combiner CPF et aide France Travail ?", a: "L'<strong>AIF</strong> de France Travail peut compléter votre CPF si le montant disponible ne suffit pas. Contactez votre conseiller France Travail et faites valider votre projet de formation. Le dossier se monte conjointement entre votre CPF et la demande d'AIF." },
        { id: 7, q: "Les formations en alternance sont-elles finançables CPF ?", a: "L'alternance est financée différemment : c'est l'<strong>OPCO</strong> de la branche professionnelle qui finance la formation. Le CPF peut être utilisé en complément pour des certifications supplémentaires. L'alternance est donc gratuite pour l'apprenti ou le salarié en contrat de professionnalisation." },
        { id: 8, q: "Peut-on financer une formation bien-être avec le CPF si on est fonctionnaire ?", a: "Oui, les fonctionnaires ont accès au CPF dans les mêmes conditions que les salariés du privé. Leur compte est crédité de 500 € par an (800 € pour les agents en catégorie C). La mobilisation se fait également via moncompteformation.gouv.fr." },
      ],
    },
    {
      titre: "🎓 Diplômes et certifications",
      id: "diplomes",
      items: [
        { id: 9, q: "Qu'est-ce que la certification Qualiopi ?", a: "Qualiopi est le <strong>certificat qualité obligatoire</strong> pour tous les organismes qui souhaitent proposer des formations financées par des fonds publics ou mutualisés (dont le CPF). Sans ce label, une école ne peut pas accéder au financement CPF. Il garantit un processus de formation sérieux, évalué par un organisme indépendant." },
        { id: 10, q: "Qu'est-ce qu'un titre RNCP et pourquoi c'est important ?", a: "Le <strong>Répertoire National des Certifications Professionnelles (RNCP)</strong> recense les diplômes et titres professionnels reconnus par l'État. Une formation avec un titre RNCP est beaucoup plus valorisée par les employeurs et ouvre des droits supplémentaires (financement CPF plus large, reconnaissance salariale). Toujours vérifier le niveau RNCP avant de s'inscrire." },
        { id: 11, q: "Quelle est la différence entre le CAP et le BP esthétique ?", a: "Le <strong>CAP esthétique</strong> est le diplôme d'entrée dans le métier (2 ans en initial, 6 à 12 mois en accéléré adulte). Le <strong>BP (Brevet Professionnel)</strong> est un niveau supérieur, accessible après le CAP, qui ouvre les portes de l'encadrement et de la gestion d'un salon. Si vous partez de zéro, commencez par le CAP." },
        { id: 12, q: "Quelle est la durée d'une formation CAP esthétique ?", a: "En formation <strong>initiale</strong> (lycée professionnel), le CAP se prépare en 2 ans. En formation <strong>continue pour adultes</strong>, les organismes proposent des parcours accélérés de 6 à 12 mois selon le rythme. En alternance, la durée est de 2 ans avec des périodes en entreprise." },
        { id: 13, q: "Quelle différence entre un RS et un RNCP ?", a: "Le <strong>RNCP</strong> correspond aux diplômes et titres professionnels (CAP, BP, BTS, titres professionnels). Le <strong>Répertoire Spécifique (RS)</strong> recense des certifications de compétences complémentaires ou transversales. Les deux sont finançables via le CPF mais le RNCP est généralement plus valorisé à l'embauche." },
        { id: 14, q: "Comment choisir entre plusieurs organismes de formation ?", a: "Vérifiez d'abord la <strong>certification Qualiopi</strong> (obligatoire), puis le <strong>titre ou diplôme délivré</strong> (niveau RNCP). Comparez ensuite les taux de réussite aux examens, les avis d'anciens élèves, le volume de pratique et le suivi proposé. Le prix ne doit pas être le critère principal." },
        { id: 15, q: "Les formations à distance sont-elles reconnues ?", a: "Oui, à condition que l'organisme soit certifié <strong>Qualiopi</strong> et que la formation mène à un titre ou diplôme reconnu (RNCP, CAP, BP). Pour les métiers avec des gestes techniques (massage, coiffure), les formations hybrides (théorie à distance + pratique en présentiel) sont souvent la meilleure option." },
      ],
    },
    {
      titre: "💼 Métiers et débouchés",
      id: "metiers",
      items: [
        { id: 16, q: "Peut-on faire une formation esthétique à tout âge ?", a: "Oui, il n'y a <strong>aucune limite d'âge</strong> pour se former aux métiers de l'esthétique. De nombreux adultes en reconversion réussissent leur CAP ou BP à 30, 40 ou même 50 ans. Le CPF est ouvert à tous les actifs, salariés comme demandeurs d'emploi, jusqu'à la retraite." },
        { id: 17, q: "Combien gagne une esthéticienne en France ?", a: "Une esthéticienne débutante gagne autour du <strong>SMIC</strong> (environ 1 400 € nets/mois). Avec l'expérience, le salaire évolue vers 1 600 à 2 000 € nets. En libéral avec une clientèle fidélisée, les revenus peuvent dépasser 2 500 € nets, selon la région et la spécialité." },
        { id: 18, q: "Quels sont les débouchés après une formation massage bien-être ?", a: "Vous pouvez exercer en <strong>spa, hôtel, thalasso, yacht, centre de bien-être, ou en libéral</strong>. La demande est forte dans les grandes villes et les zones touristiques. De nombreux praticiens créent leur propre activité à domicile ou en location de cabinet, avec des charges réduites pour démarrer." },
        { id: 19, q: "Quelle différence entre massage bien-être et massage médical ?", a: "Le <strong>massage bien-être</strong> est pratiqué en dehors du cadre médical : il vise la détente et le bien-être général, et s'exerce en spa, institut ou en libéral. Le <strong>massage médical ou kinésithérapique</strong> est réservé aux professionnels de santé (kiné, ostéo) et nécessite des études longues et réglementées." },
        { id: 20, q: "Peut-on ouvrir un salon avec un CAP esthétique ?", a: "Techniquement oui, le CAP suffit pour exercer comme esthéticienne indépendante. Mais pour ouvrir un établissement et employer du personnel, vous aurez besoin d'une <strong>expérience commerciale et managériale</strong> supplémentaire. Le BP esthétique ou une formation en gestion d'entreprise est fortement recommandée." },
        { id: 21, q: "Peut-on se spécialiser après un CAP esthétique ?", a: "Absolument. Après un CAP, vous pouvez suivre des <strong>formations courtes</strong> (soins du visage avancés, extensions de cils, onglerie, microblading…) financées en partie par le CPF. Ces spécialisations augmentent votre valeur sur le marché et permettent d'augmenter vos tarifs." },
        { id: 22, q: "Combien de temps faut-il pour trouver un emploi après la formation ?", a: "En esthétique et coiffure, les offres d'emploi sont nombreuses (fort turnover dans le secteur), généralement 1 à 3 mois. En massage bien-être, il faut souvent bâtir sa propre clientèle, ce qui prend 6 à 18 mois. Les formateurs sérieux incluent un module d'aide à l'insertion dans leur programme." },
        { id: 23, q: "La réflexologie et la naturopathie sont-elles des métiers reconnus ?", a: "Ces pratiques sont reconnues comme activités de bien-être, non comme professions de santé. Elles s'exercent en libéral, en spa ou en entreprise (QVT). Des certifications RS existent et sont finançables CPF. Le secteur du bien-être holistique connaît une forte croissance depuis 2020." },
      ],
    },
    {
      titre: "📋 Pratique et logistique",
      id: "pratique",
      items: [
        { id: 24, q: "Combien de temps dure une demande de financement CPF ?", a: "Une fois votre dossier soumis sur moncompteformation.gouv.fr, l'accord est généralement obtenu sous <strong>24 à 72 heures</strong> pour les formations éligibles. Prévoyez un délai de 10 jours ouvrés entre votre demande et le début de la formation (obligation légale de rétractation)." },
        { id: 25, q: "Peut-on cumuler plusieurs formations avec le CPF ?", a: "Oui, tant que votre solde CPF le permet. Vous pouvez enchainer des formations, mais pas les suivre en parallèle via le CPF. Chaque formation doit être terminée (ou le CPF remboursé en cas d'abandon) avant d'en financer une nouvelle." },
        { id: 26, q: "Que se passe-t-il si j'abandonne une formation financée par le CPF ?", a: "Si vous abandonnez sans motif valable, les heures utilisées restent débitées de votre compte. En cas de force majeure (maladie, accident), une prise en charge partielle ou un report peut être négocié avec l'organisme. Contactez-les rapidement." },
        { id: 27, q: "Peut-on suivre une formation CPF pendant son congé maternité ?", a: "Oui, il n'existe pas d'interdiction légale. Le congé maternité est une période pendant laquelle vous continuez à accumuler vos droits CPF. La formation peut être suivie à distance pendant cette période, ou planifiée juste avant le retour en poste." },
        { id: 28, q: "Mon employeur peut-il s'opposer à ma formation CPF ?", a: "Si la formation se déroule <strong>hors temps de travail</strong>, l'employeur n'a pas son mot à dire. Si elle empiète sur votre temps de travail, un accord préalable est nécessaire. Dans tous les cas, le CPF est un droit individuel que vous exercez librement hors temps de travail." },
        { id: 29, q: "Peut-on utiliser le CPF depuis l'étranger ?", a: "Oui, si vous êtes salarié ou demandeur d'emploi en France et que vous disposez d'un compte CPF. La formation peut être suivie à distance. Pour les formations en présentiel à l'étranger, la prise en charge CPF est possible si la formation est référencée sur moncompteformation.gouv.fr." },
      ],
    },
  ];

  const allFaqs = faqSections.flatMap((s) => s.items);

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: allFaqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a.replace(/<[^>]+>/g, "") },
    })),
  };

  const body = `<h1>FAQ — tout savoir sur les formations beauté et bien-être CPF</h1>
<p class="lead">Les réponses aux questions les plus fréquentes sur le financement CPF, les diplômes, les métiers et les formations dans le secteur beauté et bien-être.</p>
<style>
.faq-section{margin-bottom:32px}
.faq-section-title{font-size:1.15rem;font-weight:700;color:var(--p);margin:0 0 12px;padding:0}
.faq-item{border:1px solid var(--hairline);border-radius:10px;margin-bottom:8px;overflow:hidden}
.faq-btn{width:100%;background:none;border:none;padding:16px 20px;text-align:left;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:.97rem;font-weight:600;color:var(--heading);line-height:1.4}
.faq-btn:hover{background:var(--p-light)}
.faq-btn .faq-arrow{flex-shrink:0;transition:transform .2s;font-size:.8rem;color:var(--muted)}
.faq-btn[aria-expanded="true"]{background:var(--p-light);color:var(--p)}
.faq-btn[aria-expanded="true"] .faq-arrow{transform:rotate(180deg)}
.faq-answer{display:none;padding:0 20px 16px;font-size:.93rem;line-height:1.7;color:var(--body)}
.faq-answer.open{display:block}
</style>
<script>
function toggleFaq(btn){
  var expanded=btn.getAttribute('aria-expanded')==='true';
  btn.setAttribute('aria-expanded',expanded?'false':'true');
  btn.nextElementSibling.classList.toggle('open',!expanded);
}
// Auto-open from hash
window.addEventListener('load',function(){
  var h=location.hash;
  if(h){var el=document.querySelector(h+' .faq-btn');if(el){el.setAttribute('aria-expanded','true');el.nextElementSibling.classList.add('open');el.scrollIntoView({behavior:'smooth',block:'center'});}}
});
</script>
${faqSections.map((sec) => `
<div class="faq-section">
  <h2 class="faq-section-title">${sec.titre}</h2>
  ${sec.items.map((f) => `<div class="faq-item" id="faq-${f.id}">
  <button class="faq-btn" aria-expanded="false" onclick="toggleFaq(this)">
    <span>${esc(f.q)}</span><span class="faq-arrow">▼</span>
  </button>
  <div class="faq-answer"><p>${f.a}</p></div>
</div>`).join("")}
</div>`).join("")}
<div class="mesh" style="margin-top:40px">
  <h2>Trouver votre formation</h2>
  <div class="chips">
    <a class="chip" href="/formations/esthetique-soin-corporel">💆 Esthétique (CAP, BP)</a>
    <a class="chip" href="/formations/massage-bien-etre">🤲 Massage bien-être</a>
    <a class="chip" href="/formations/coiffure">✂️ Coiffure</a>
    <a class="chip" href="/formations/manucurie">💅 Manucure</a>
    <a class="chip" href="/formations/maquillage">💄 Maquillage</a>
    <a class="chip" href="/financement-cpf">💰 Guide financement CPF</a>
    <a class="chip" href="/blog">📖 Blog &amp; conseils</a>
  </div>
</div>
<a class="cta" href="/formations">Trouver ma formation CPF →</a>`;

  res.send(
    renderPage({
      title: "FAQ formations beauté bien-être CPF – 29 réponses clés | Formation Santé Bien-être",
      description: "Toutes les réponses sur le CPF beauté bien-être : financement, Qualiopi, CAP vs BP, alternance, débouchés, salaires. 4 thèmes, 29 questions. Guide 2026.",
      canonical,
      jsonLd: [faqLd],
      breadcrumb: [{ name: "Accueil", url: `${base}/formations` }, { name: "FAQ" }],
      body,
    })
  );
});

seoRouter.get("/politique-confidentialite", (req, res) => {
  const base = baseUrl(req);
  const cookiesSection = gaId()
    ? `<div class="mesh"><h2>Cookies &amp; mesure d'audience</h2><p>Ce site utilise <strong>Google Analytics 4</strong> (fourni par Google) pour mesurer son audience de façon agrégée, <strong>uniquement si vous y consentez</strong> via la bannière affichée lors de votre première visite. Aucun cookie de mesure n'est déposé tant que vous n'avez pas accepté ; vous pouvez retirer votre consentement à tout moment en supprimant les cookies de ce site dans votre navigateur. Google Analytics 4 ne conserve pas votre adresse IP. Les statistiques sont susceptibles d'être traitées par Google hors de l'Union européenne, dans le cadre du Data Privacy Framework UE–États-Unis. Aucun cookie publicitaire n'est utilisé. La police d'écriture est chargée via Google Fonts.</p></div>`
    : `<div class="mesh"><h2>Cookies</h2><p>Ce site n'utilise <strong>aucun cookie publicitaire ni outil de traçage analytique</strong> à ce jour. Seules des ressources techniques nécessaires à son affichage sont utilisées (dont la police d'écriture chargée via Google Fonts).</p></div>`;
  const body = `<h1>Politique de confidentialité</h1>
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
  res.send(renderPage({ title: "Politique de confidentialité | Formation Santé Bien-être", description: "Comment vos données personnelles sont traitées sur formation-sante-bienetre.fr (RGPD).", canonical: `${base}/politique-confidentialite`, noindex: true, breadcrumb: [{ name: "Accueil", url: `${base}/formations` }, { name: "Politique de confidentialité" }], body }));
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
  const allVilles = seoVilles();
  const villeMap = new Map(allVilles.map((v) => [v.slug, v.n]));

  const cityCards = TOP_CITIES.map((city) => {
    const n = villeMap.get(city.slug) ?? 0;
    return `<a class="city-card" href="/ville/${city.slug}" style="background-image:url('${city.photo}'),${city.gradient}">
  <span class="city-card-em">${city.emoji}</span>
  <div>
    <div class="city-card-name">${esc(city.name)}</div>
    <div class="city-card-meta">${esc(city.region)}</div>
    ${n > 0 ? `<span class="city-card-count">${n} organisme${n > 1 ? "s" : ""}</span>` : ""}
  </div>
</a>`;
  }).join("");

  const otherVilles = allVilles.filter((v) => !TOP_CITIES.some((c) => c.slug === v.slug));
  const allRegions = [...new Set(otherVilles.map((v) => cityRegion(v.slug)))].sort();
  const otherChips = otherVilles.map((v) =>
    `<a class="chip" href="/ville/${v.slug}" data-reg="${esc(cityRegion(v.slug))}" style="display:none">📌 ${esc(titleCaseVille(v.ville))} (${v.n})</a>`
  ).join("");

  const body = `<h1>Se former près de chez vous</h1>
<p class="lead">Trouvez un organisme de formation beauté &amp; bien-être dans votre ville, finançable par le CPF.</p>
<div class="section-label"><h2>🏙️ Grandes villes</h2><span class="section-label-line"></span></div>
<div class="city-grid">${cityCards}</div>
<div class="section-label" style="margin-top:32px"><h2>🗺️ Autres villes par région</h2><span class="section-label-line"></span></div>
<div class="region-filter">
  <button class="reg-btn" onclick="filterReg(this,'all')">Toutes</button>
  ${allRegions.map((r) => `<button class="reg-btn" data-reg="${esc(r)}" onclick="filterReg(this,'${esc(r)}')">${esc(r)}</button>`).join("")}
</div>
<div class="chips" id="other-villes">${otherChips}</div>
<script>
function filterReg(btn,reg){
  document.querySelectorAll('.reg-btn').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  document.querySelectorAll('#other-villes .chip').forEach(function(c){
    c.style.display=(reg==='all'||c.dataset.reg===reg)?'':'none';
  });
}
</script>`;

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
  const villeCatsDepts = seoVilleCombos()
    .filter((c) => slugify(c.ville) === v.slug)
    .map((c) => {
      const cat = cats.get(c.categorie);
      return cat ? { slug: c.categorie, nom: cat.nom, n: c.n } : null;
    })
    .filter(Boolean) as { slug: string; nom: string; n: number }[];

  const sidebar = buildSidebar({
    allCats: villeCatsDepts,
    deptLinkBase: `/ville/${v.slug}`,
  });

  const body = `<a class="back-btn" href="/villes">← Toutes les villes</a>
<h1>Formations beauté &amp; bien-être à ${esc(nomV)}</h1>
<p class="lead">${v.n} formations CPF dispensées par des organismes situés à ${esc(nomV)}.</p>
${withSidebar(sidebar, formationCards(items))}`;
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
  const allCatsForCity = seoVilleCombos()
    .filter((c) => slugify(c.ville) === v.slug)
    .map((c) => {
      const ci = catIndex().get(c.categorie);
      return ci ? { slug: c.categorie, nom: ci.nom, n: c.n } : null;
    })
    .filter(Boolean) as { slug: string; nom: string; n: number }[];

  const sidebar2 = buildSidebar({
    currentCatSlug: req.params.categorie,
    allCats: allCatsForCity,
    deptLinkBase: `/ville/${v.slug}`,
  });

  const body = `<a class="back-btn" href="/ville/${v.slug}">← Toutes les formations à ${esc(nomV)}</a>
<h1>Formation ${esc(cat.nom)} à ${esc(nomV)}</h1>
<p class="lead">${items.length} formation(s) ${esc(cat.nom)} à ${esc(nomV)}, éligibles au CPF.</p>
${withSidebar(sidebar2, formationCards(items))}`;
  res.send(
    renderPage({
      title: `Formation ${cat.nom} à ${nomV} – CPF | Formation Santé Bien-être`,
      description: `Formations ${cat.nom} à ${nomV} éligibles au CPF. Organismes, tarifs, à distance ou présentiel.`,
      canonical,
      noindex: items.length < 3,
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

  const METIER_CONFIG: { slug: string; label: string; emoji: string; color: string; bg: string; desc: string; href: string }[] = [
    { slug: "coiffure", label: "Coiffure", emoji: "✂️", color: "#166534", bg: "#f0fdf4", desc: "Coupes, colorations, techniques professionnelles", href: "/metier/coiffure" },
    { slug: "esthetique-soin-corporel", label: "Esthétique & soins", emoji: "🧖‍♀️", color: "#7e22ce", bg: "#fdf4ff", desc: "Soins du visage, épilation, modelage, bien-être", href: "/metier/esthetique-soin-corporel" },
    { slug: "manucurie", label: "Manucurie & onglerie", emoji: "💅", color: "#c2410c", bg: "#fff7ed", desc: "Pose de gel, nail art, prothésie ongulaire", href: "/metier/manucurie" },
    { slug: "maquillage", label: "Maquillage", emoji: "💄", color: "#be185d", bg: "#fdf2f8", desc: "Maquillage de scène, événementiel, beauté", href: "/metier/maquillage" },
    { slug: "massage-bien-etre", label: "Massage & bien-être", emoji: "💆‍♀️", color: "#0369a1", bg: "#f0f9ff", desc: "Massage suédois, californien, ayurvédique...", href: "/metier/massage-bien-etre" },
    { slug: "specialisation-coiffure", label: "Spécialisation coiffure", emoji: "🎨", color: "#92400e", bg: "#fefce8", desc: "Balayage, colorimétrie, extensions, permanente", href: "/metier/specialisation-coiffure" },
    { slug: "spa-manager", label: "Spa manager", emoji: "🏪", color: "#0f766e", bg: "#f0fdfa", desc: "Gérer et diriger un spa ou un institut de beauté", href: "/#/recherche/spa%20manager" },
    { slug: "naturopathie", label: "Naturopathie", emoji: "🌿", color: "#15803d", bg: "#f7fef2", desc: "Approches naturelles et holistiques du bien-être", href: "/#/recherche/naturopathie" },
    { slug: "reflexologie", label: "Réflexologie", emoji: "👣", color: "#7c3aed", bg: "#f5f3ff", desc: "Réflexologie plantaire, palmaire, faciale", href: "/#/recherche/reflexologie" },
    { slug: "aromatherapie", label: "Aromathérapie", emoji: "🌸", color: "#db2777", bg: "#fdf2f8", desc: "Huiles essentielles, phytothérapie, soins naturels", href: "/#/recherche/aromatherapie" },
    { slug: "formation-en-entreprise", label: "Formation en salon", emoji: "🏢", color: "#1d4ed8", bg: "#eff6ff", desc: "Perfectionnement en entreprise via OPCO AKTO", href: "/#/recherche/salon" },
    { slug: "maquillage-permanent", label: "Maquillage permanent", emoji: "✨", color: "#b45309", bg: "#fffbeb", desc: "Microblading, sourcils, tatouage cosmétique", href: "/#/recherche/maquillage%20permanent" },
  ];

  const metierGrid = METIER_CONFIG.map((m) => `
<a href="${m.href}" class="metier-tile-big" style="background:${m.bg};">
  <span class="mt-em-big">${m.emoji}</span>
  <div class="mt-body">
    <span class="mt-name-big" style="color:${m.color}">${esc(m.label)}</span>
    <span class="mt-desc">${esc(m.desc)}</span>
  </div>
  <span class="mt-arrow" style="color:${m.color}">→</span>
</a>`).join("");

  const body = `<h1>Les métiers de la beauté et du bien-être</h1>
<p class="lead">On te donne tout ce que tu dois savoir : les formations possibles, les salaires réels et les débouchés concrets.</p>
<style>
.metier-grid-big{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-top:24px}
.metier-tile-big{display:flex;align-items:center;gap:14px;padding:18px 20px;border-radius:14px;border:2px solid transparent;text-decoration:none;transition:border-color .2s,box-shadow .2s,transform .15s}
.metier-tile-big:hover{border-color:rgba(22,163,74,.3);box-shadow:0 4px 20px rgba(0,0,0,.08);transform:translateY(-2px)}
.mt-em-big{font-size:2.2rem;line-height:1;flex-shrink:0}
.mt-body{flex:1;display:flex;flex-direction:column;gap:2px}
.mt-name-big{font-size:1rem;font-weight:700;line-height:1.2}
.mt-desc{font-size:.8rem;color:#64748b;line-height:1.3}
.mt-arrow{font-size:1.3rem;font-weight:600;flex-shrink:0;transition:transform .2s}
.metier-tile-big:hover .mt-arrow{transform:translateX(4px)}
</style>
<div class="metier-grid-big">${metierGrid}</div>
<div class="card" style="margin-top:32px;text-align:center">
  <p style="margin:0 0 12px;font-weight:600">Vous ne trouvez pas votre métier ?</p>
  <a class="btn" href="/formations">Explorer toutes les formations →</a>
</div>`;

  res.send(
    renderPage({
      title: "Métiers de la beauté et du bien-être | Formation Santé Bien-être",
      description: "Découvrez les métiers de la beauté et du bien-être : missions, formations CPF, salaires et débouchés concrets.",
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
  // Article mis en avant (premier) + grille des autres
  const [featured, ...rest] = arts;
  const featuredHtml = featured ? `
<a class="blog-featured" href="/blog/${featured.slug}">
  <div class="blog-featured-body">
    <span class="badge" style="margin-bottom:10px">À la une</span>
    <h2 class="blog-featured-title">${esc(featured.title)}</h2>
    <p class="blog-featured-excerpt">${esc(featured.excerpt)}</p>
    <span class="blog-read-more">Lire l'article →</span>
  </div>
</a>` : "";

  const gridHtml = rest.length ? `<div class="blog-grid">
${rest.map((a) => `<a class="blog-card" href="/blog/${a.slug}">
  <div class="blog-card-body">
    <h3 class="blog-card-title">${esc(a.title)}</h3>
    <p class="blog-card-excerpt">${esc(a.excerpt)}</p>
    <span class="blog-read-more">Lire →</span>
  </div>
</a>`).join("")}
</div>` : "";

  const body = `<h1>Blog — formations &amp; métiers du bien-être</h1>
<p class="lead">Conseils pratiques, financement CPF et orientation pour se former dans la beauté et le bien-être.</p>
${featuredHtml}
${gridHtml}
<div class="mesh" style="margin-top:40px">
  <h2>Explorer les formations</h2>
  <div class="chips">
    <a class="chip" href="/formations/esthetique-soin-corporel">💆 Esthétique</a>
    <a class="chip" href="/formations/massage-bien-etre">🤲 Massage bien-être</a>
    <a class="chip" href="/formations/coiffure">✂️ Coiffure</a>
    <a class="chip" href="/formations/manucurie">💅 Manucure</a>
    <a class="chip" href="/financement-cpf">💰 Financement CPF</a>
    <a class="chip" href="/metiers">🎯 Tous les métiers</a>
  </div>
</div>`;

  const blogLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Blog Formation Santé Bien-être",
    url: `${base}/blog`,
    description: "Conseils pratiques, guides financement CPF et fiches métiers pour se former en esthétique, massage, coiffure et bien-être.",
    publisher: { "@type": "Organization", name: "Formation Santé Bien-être", url: `${base}/formations` },
    blogPost: arts.slice(0, 10).map((a) => ({
      "@type": "BlogPosting",
      headline: a.title,
      url: `${base}/blog/${a.slug}`,
      description: a.metaDescription,
      ...(a.publishedAt ? { datePublished: a.publishedAt } : {}),
    })),
  };
  res.send(
    renderPage({
      title: "Blog formations beauté & bien-être | Formation Santé Bien-être",
      description: "Conseils pratiques, guides financement CPF et fiches métiers pour se former en esthétique, massage, coiffure et bien-être.",
      canonical: `${base}/blog`,
      jsonLd: [blogLd],
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
  const allArts = listArticles().filter((x) => x.slug !== a.slug);
  const slugWords = new Set(a.slug.split("-").filter((w) => w.length > 3));
  const scored = allArts.map((x) => ({
    art: x,
    score: x.slug.split("-").filter((w) => slugWords.has(w)).length,
  })).sort((a, b) => b.score - a.score);
  const arts = scored.slice(0, 3).map((s) => s.art);
  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.metaDescription,
    mainEntityOfPage: canonical,
    publisher: { "@type": "Organization", name: "Formation Santé Bien-être", url: `${base}/formations` },
  };
  const relatedHtml = arts.length ? `<div class="mesh"><h2>Articles similaires</h2><div class="blog-grid blog-grid--small">
${arts.map((x) => `<a class="blog-card" href="/blog/${x.slug}"><div class="blog-card-body"><h3 class="blog-card-title" style="font-size:.95rem">${esc(x.title)}</h3><span class="blog-read-more">Lire →</span></div></a>`).join("")}
</div></div>` : "";

  const dateStr = a.updatedAt ?? a.publishedAt;
  const dateDisplay = dateStr ? new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : null;
  const enrichedLd = {
    ...ld,
    ...(a.publishedAt ? { datePublished: a.publishedAt } : {}),
    ...(a.updatedAt ? { dateModified: a.updatedAt } : {}),
    ...(a.image ? { image: a.image } : {}),
    author: { "@type": "Organization", name: "Formation Santé Bien-être", url: `${base}/formations` },
  };
  const articleJsonLd: object[] = [enrichedLd];
  if (a.faq && a.faq.length) {
    articleJsonLd.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: a.faq.map((x) => ({
        "@type": "Question",
        name: x.q,
        acceptedAnswer: { "@type": "Answer", text: x.a },
      })),
    });
  }
  const body = `<h1>${esc(a.title)}</h1>
${dateDisplay ? `<p style="font-size:.82rem;color:var(--muted);margin:-8px 0 18px;display:flex;align-items:center;gap:6px"><time datetime="${esc(dateStr ?? "")}">${dateDisplay}</time>${a.updatedAt && a.updatedAt !== a.publishedAt ? " · Mis à jour" : ""}</p>` : ""}
<p class="lead" style="font-size:1rem;border-left:3px solid var(--p);padding-left:14px;color:var(--body)">${esc(a.metaDescription)}</p>
<article class="article">${a.html}</article>
<div class="article-cta-block">
  <p style="font-weight:700;font-size:1.05rem;margin:0 0 12px">Prêt(e) à te former ?</p>
  <a class="cta" href="/formations">Voir toutes les formations CPF</a>
  <a class="cta" href="/financement-cpf" style="background:transparent;color:var(--p);border:2px solid var(--p);margin-left:10px">Guide financement</a>
</div>
<div class="mesh"><h2>Explorer les formations</h2><div class="chips">
  <a class="chip" href="/formations/esthetique-soin-corporel">💆 Esthétique</a>
  <a class="chip" href="/formations/massage-bien-etre">🤲 Massage bien-être</a>
  <a class="chip" href="/formations/coiffure">✂️ Coiffure</a>
  <a class="chip" href="/formations/manucurie">💅 Manucure</a>
  <a class="chip" href="/formations/maquillage">💄 Maquillage</a>
  <a class="chip" href="/faq">❓ FAQ formations CPF</a>
</div></div>
${relatedHtml}`;

  res.send(
    renderPage({
      title: `${a.title} | Formation Santé Bien-être`,
      description: a.metaDescription,
      canonical,
      ogImage: a.image,
      publishedAt: a.publishedAt,
      updatedAt: a.updatedAt,
      jsonLd: articleJsonLd,
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

  const sidebarDepts = r.facets.departements
    .slice(0, 30)
    .map((d: any) => {
      const di = dcode.get(d.code);
      return di ? { code: d.code, nom: d.nom, slug: di.slug, n: d.n } : null;
    })
    .filter(Boolean) as { code: string; nom: string; slug: string; n: number }[];

  const allCatsList = [...cats.entries()]
    .filter(([s, c]) => c.n > 0 && !["maquillage-spectacle","secretariat-assistanat-specialise","communication-professionnelle","action-commerciale"].includes(s))
    .map(([s, c]) => ({ slug: s, nom: c.nom, n: c.n }));

  const sidebar = buildSidebar({
    currentCatSlug: slug,
    allCats: allCatsList,
    depts: sidebarDepts,
    deptLinkBase: `/formations/${slug}`,
  });

  const cards = formationCards(r.items);
  const catDisplay = normCat(cat.nom);
  const qualiopi = r.items.filter((f: any) => f.organisme_qualiopi).length;
  const distance = r.items.filter((f: any) => f.a_distance).length;
  const blogLinks = `<div class="mesh"><h2>Nos guides sur les formations ${esc(catDisplay)}</h2><div class="chips">
    <a class="chip" href="/blog">📖 Tous nos articles</a>
    <a class="chip" href="/financement-cpf">💰 Financement CPF</a>
    <a class="chip" href="/faq">❓ FAQ formations</a>
    <a class="chip" href="/metiers">🎯 Fiches métiers</a>
  </div></div>`;
  const body = `<a class="back-btn" href="/formations">← Toutes les formations</a>
<h1>Formations ${esc(catDisplay)} éligibles CPF</h1>
<p class="lead">${r.total} formations en ${esc(catDisplay)} finançables 100&nbsp;% par le CPF, dont ${qualiopi} certifiées Qualiopi${distance > 0 ? ` et ${distance} disponibles à distance` : ""}. Comparez les organismes et demandez vos informations gratuitement.</p>
${withSidebar(sidebar, cards)}
${blogLinks}`;

  const metaDesc = `${r.total} formations ${catDisplay} certifiées Qualiopi, 100 % éligibles CPF. Présentiel et distance disponibles. Comparez les organismes et demandez vos informations gratuitement.`;
  res.send(
    renderPage({
      title: `Formations ${catDisplay} CPF – ${r.total} formations Qualiopi | Formation Santé Bien-être`,
      description: metaDesc,
      canonical,
      ogImage: CAT_OG_IMAGES[slug] ?? DEFAULT_OG_IMAGE,
      jsonLd: [courseListLd(r.items, canonical)],
      breadcrumb: [
        { name: "Accueil", url: `${base}/formations` },
        { name: "Formations", url: `${base}/formations` },
        { name: normCat(cat.nom) },
      ],
      body,
    })
  );
});

// ---------- 404 SSR helper ----------
function render404(req: Request): string {
  const base = baseUrl(req);
  return renderPage({
    title: "Page introuvable (404) | Formation Santé Bien-être",
    description: "La page que vous cherchez n'existe pas. Retrouvez toutes nos formations CPF en beauté et bien-être.",
    canonical: `${base}/formations`,
    breadcrumb: [{ name: "Accueil", url: `${base}/formations` }, { name: "Page introuvable" }],
    body: `<h1>Page introuvable</h1>
<p class="lead">La page que vous cherchez n'existe pas ou a été déplacée.</p>
<div class="mesh"><h2>Que recherchez-vous ?</h2><div class="chips">
  <a class="chip" href="/formations">🌿 Toutes les formations</a>
  <a class="chip" href="/formations/esthetique-soin-corporel">💆 Esthétique</a>
  <a class="chip" href="/formations/massage-bien-etre">🤲 Massage bien-être</a>
  <a class="chip" href="/formations/coiffure">✂️ Coiffure</a>
  <a class="chip" href="/blog">📖 Blog</a>
  <a class="chip" href="/faq">❓ FAQ</a>
</div></div>`,
  });
}

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

  const national = searchFormations({ categorie: slug, pageSize: 1 });
  const dcode = deptByCode();

  const sidebarDepts = national.facets.departements
    .slice(0, 30)
    .map((d: any) => {
      const di = dcode.get(d.code);
      return di ? { code: d.code, nom: d.nom, slug: di.slug, n: d.n } : null;
    })
    .filter(Boolean) as { code: string; nom: string; slug: string; n: number }[];

  const allCatsList = [...cats.entries()]
    .filter(([s, c]) => c.n > 0 && !["maquillage-spectacle","secretariat-assistanat-specialise","communication-professionnelle","action-commerciale"].includes(s))
    .map(([s, c]) => ({ slug: s, nom: c.nom, n: c.n }));

  const sidebar = buildSidebar({
    currentCatSlug: slug,
    currentDeptSlug: dept.slug,
    allCats: allCatsList,
    depts: sidebarDepts,
    deptLinkBase: `/formations/${slug}`,
  });

  const cards = formationCards(r.items);
  const catDisplay2 = normCat(cat.nom);
  const qualiopi2 = r.items.filter((f: any) => f.organisme_qualiopi).length;
  const body = `<a class="back-btn" href="/formations/${slug}">← ${esc(catDisplay2)} — toute la France</a>
<h1>Formation ${esc(catDisplay2)} ${esc(dept.nom)} – CPF</h1>
<p class="lead">${r.total} formation${r.total > 1 ? "s" : ""} ${esc(catDisplay2)} dans le ${esc(dept.nom)}, éligibles au CPF${qualiopi2 > 0 ? ` dont ${qualiopi2} certifiées Qualiopi` : ""}. Comparez les organismes et demandez vos informations.</p>
${withSidebar(sidebar, cards)}
<div class="mesh"><h2>Formations ${esc(catDisplay2)} dans d'autres régions</h2><div class="chips">
  <a class="chip" href="/formations/${esc(slug)}">🗺️ Toute la France (${national.total})</a>
  <a class="chip" href="/blog">📖 Nos guides</a>
  <a class="chip" href="/faq">❓ FAQ</a>
</div></div>`;

  res.send(
    renderPage({
      title: `Formation ${catDisplay2} ${dept.nom} – CPF | Formation Santé Bien-être`,
      description: `${r.total} formation${r.total > 1 ? "s" : ""} ${catDisplay2} dans le ${dept.nom} éligibles au CPF. Organismes certifiés Qualiopi, présentiel et distance. Demande gratuite.`,
      canonical,
      noindex: r.items.length < 3,
      ogImage: CAT_OG_IMAGES[slug] ?? DEFAULT_OG_IMAGE,
      jsonLd: [courseListLd(r.items, canonical)],
      breadcrumb: [
        { name: "Accueil", url: `${base}/formations` },
        { name: "Formations", url: `${base}/formations` },
        { name: normCat(cat.nom), url: `${base}/formations/${slug}` },
        { name: dept.nom },
      ],
      body,
    })
  );
});

// ---------- catch-all 404 SSR pour les routes dynamiques non résolues ----------
// Empêche les soft 404 (200 avec shell SPA) sur des URLs SSR invalides.
seoRouter.get("/formations/:a", (req, res) => res.status(404).send(render404(req)));
seoRouter.get("/formations/:a/:b", (req, res) => res.status(404).send(render404(req)));
seoRouter.get("/metier/:a", (req, res) => res.status(404).send(render404(req)));
seoRouter.get("/blog/:a", (req, res) => res.status(404).send(render404(req)));
seoRouter.get("/ville/:a", (req, res) => res.status(404).send(render404(req)));
seoRouter.get("/ville/:a/:b", (req, res) => res.status(404).send(render404(req)));
