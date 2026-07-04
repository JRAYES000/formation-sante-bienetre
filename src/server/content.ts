// Chargement du contenu éditorial (fiches métier JSON + articles blog Markdown)
// généré dans content/. Lu depuis le disque au runtime (présent dans l'image Docker).
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = resolve(__dirname, "../../content");
const METIERS_DIR = join(CONTENT_DIR, "metiers");
const BLOG_DIR = join(CONTENT_DIR, "blog");
const CATEGORY_FAQ_DIR = join(CONTENT_DIR, "categories", "faq");

export interface Metier {
  slug: string;
  metier: string;
  titre: string;
  metaDescription?: string;
  intro?: string;
  missions?: string[];
  competences?: string[];
  debouches?: string[];
  salaire?: { debutant?: string; confirme?: string; note?: string };
  evolution?: string[];
  formationConseil?: string;
  faq?: { q: string; a: string }[];
}

export function getMetier(slug: string): Metier | null {
  const f = join(METIERS_DIR, `${slug}.json`);
  if (!existsSync(f)) return null;
  try {
    return JSON.parse(readFileSync(f, "utf8")) as Metier;
  } catch {
    return null;
  }
}

export function listMetiers(): { slug: string; metier: string }[] {
  if (!existsSync(METIERS_DIR)) return [];
  return readdirSync(METIERS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const m = getMetier(f.replace(/\.json$/, ""));
      return m ? { slug: m.slug, metier: m.metier } : null;
    })
    .filter(Boolean) as { slug: string; metier: string }[];
}

// FAQ des hubs categorie (/formations/:categorie) - Pilier 5.C.2.
// Fichiers content/categories/faq/<slug-categorie>.json, tableau [{ q, a }].
export function getCategoryFaq(slug: string): { q: string; a: string }[] {
  const f = join(CATEGORY_FAQ_DIR, `${slug}.json`);
  if (!existsSync(f)) return [];
  try {
    const data = JSON.parse(readFileSync(f, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export interface Article {
  slug: string;
  title: string;
  metaDescription: string;
  excerpt: string;
  image?: string;
  publishedAt?: string;
  updatedAt?: string;
  html?: string;
  metier?: string;
  faq?: { q: string; a: string }[];
}

// Dictionnaire de rattachement métier (Pilier 4, règle R3/R4/R6).
// Priorité 1 : champ "metier:" explicite dans le front-matter de l'article.
// Priorité 2 (repli) : déduction par mots-clés sur le slug du fichier.
// Les 5 clés correspondent aux slugs de catégorie (content/metiers/*.json).
const METIER_KEYWORDS: Record<string, string[]> = {
  "coiffure": ["coiffure", "coiffeur", "barbier", "chignon", "lissage", "bouclage", "colorimetrie", "coloration-vegetale", "tresses", "extension-cheveux", "prothese-capillaire", "cuir-chevelu", "trichologie"],
  "manucurie": ["manucure", "ongulaire", "onglerie", "nail-art", "nail-design"],
  "maquillage": ["maquillage", "maquilleur", "microblading", "permanent-cpf"],
  "massage-bien-etre": ["massage", "spa-praticien", "spa-manager", "reflexologie", "shiatsu", "kobido", "lomi-lomi", "drainage-lymphatique", "sophrologie", "naturopathie", "reiki", "meditation", "mindfulness", "yoga", "pilates", "acupression", "do-in", "amma-assis", "aromatherapie", "art-therapie", "ayurveda", "bols-tibetains", "sonotherapie", "chromotherapie", "coaching-bien-etre", "cranio-sacre", "fasciatherapie", "feng-shui", "gua-sha", "herboristerie", "phytotherapie", "hypnose", "kinesiologie", "lithotherapie", "musicotherapie", "nutrition-beaute", "thalasso", "thermalisme", "tui-na", "ventouses", "cupping", "praticien-massage", "rncp-massage", "salaire-masseuse"],
  "esthetique-soin-corporel": ["esthetique", "epilation", "peeling", "microdermabrasion", "radiofrequence", "dermaplaning", "cryotherapie", "photobiomodulation", "socio-esthetique", "visagiste", "soins-du-visage", "soins-corps", "soins-pieds", "pedicurie", "cosmetique", "cosmetologue", "estheticienne", "institut-beaute", "extensions-cils", "volume-russe", "pressotherapie"],
};

function deduceMetier(slug: string): string | undefined {
  for (const [metier, kws] of Object.entries(METIER_KEYWORDS)) {
    if (kws.some((kw) => slug.includes(kw))) return metier;
  }
  return undefined;
}

// Métier rattaché à un article : champ explicite en priorité, sinon déduction.
export function articleMetier(a: Pick<Article, "slug" | "metier">): string | undefined {
  return a.metier || deduceMetier(a.slug);
}

// Extrait la section FAQ / Questions frequentes d'un article Markdown et la
// transforme en paires { q, a } exploitables pour un schema FAQPage.
// Supporte deux formats rencontres dans les 203 articles du blog :
//   - question en gras sur sa propre ligne (**Question ?**)
//   - question en sous-titre H3, numerote ou non (### 1. Question ?)
function stripMdInline(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractFaqFromMarkdown(raw: string): { q: string; a: string }[] {
  const lines = raw.split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s+(FAQ|Questions?\s+fr[éeE]quentes?)\b/i.test(lines[i].trim())) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) return [];
  let end = lines.length;
  for (let i = start; i < lines.length; i++) {
    const t = lines[i].trim();
    if (/^##\s+/.test(t) && !/^###/.test(t)) {
      end = i;
      break;
    }
  }
  const section = lines.slice(start, end);

  const faq: { q: string; a: string }[] = [];
  let curQ: string | null = null;
  let curA: string[] = [];
  const flush = () => {
    if (curQ) {
      const a = stripMdInline(curA.join(" ")).trim();
      const q = stripMdInline(curQ).trim();
      if (a && q) faq.push({ q, a });
    }
    curQ = null;
    curA = [];
  };
  for (const rawLine of section) {
    const line = rawLine.trim();
    if (!line) continue;
    const h3 = line.match(/^###\s*(?:\d+[.)]\s*)?(.+)$/);
    const boldOnly = line.match(/^\*\*(.+?)\*\*\s*$/);
    if (h3) {
      flush();
      curQ = h3[1];
      continue;
    }
    if (boldOnly) {
      flush();
      curQ = boldOnly[1];
      continue;
    }
    if (curQ) curA.push(line);
  }
  flush();
  return faq;
}

// Parse minimal d'un front-matter YAML simple (clé: "valeur").
function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return { meta, body: m[2] };
}

export function getArticle(slug: string): Article | null {
  const f = join(BLOG_DIR, `${slug}.md`);
  if (!existsSync(f)) return null;
  const { meta, body } = parseFrontmatter(readFileSync(f, "utf8"));
  // Pas de fallback mtime : dans l'image Docker, le mtime = date du build, donc
  // toutes les dates auraient changé à chaque déploiement. Seul le front-matter fait foi.
  const faq = extractFaqFromMarkdown(body);
  return {
    slug: meta.slug || slug,
    title: meta.title || slug,
    metaDescription: meta.metaDescription || "",
    excerpt: meta.excerpt || "",
    image: meta.image || undefined,
    publishedAt: meta.publishedAt || undefined,
    updatedAt: meta.updatedAt || undefined,
    metier: meta.metier || undefined,
    html: (marked.parse(body, { async: false }) as string).replace(/^<h1[^>]*>[\s\S]*?<\/h1>\s*/i, ""),
    faq: faq.length ? faq : undefined,
  };
}

export function listArticles(): Article[] {
  if (!existsSync(BLOG_DIR)) return [];
  const arts = readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const a = getArticle(f.replace(/\.md$/, ""));
      return a ? { slug: a.slug, title: a.title, metaDescription: a.metaDescription, excerpt: a.excerpt, image: a.image, publishedAt: a.publishedAt, updatedAt: a.updatedAt, metier: a.metier } : null;
    })
    .filter(Boolean) as Article[];
  // Tri par date décroissante (la plus récente en premier) — corrige le tri alphabétique
  // par défaut de readdirSync (constat C2 de l'audit Pilier 4, règles R1/R2).
  return arts.sort((a, b) => (b.updatedAt ?? b.publishedAt ?? "").localeCompare(a.updatedAt ?? a.publishedAt ?? ""));
}

// Articles les plus récents rattachés à un métier donné (règles R3/R4/R6).
export function listArticlesByMetier(metier: string, limit = 4): Article[] {
  return listArticles().filter((a) => articleMetier(a) === metier).slice(0, limit);
}
