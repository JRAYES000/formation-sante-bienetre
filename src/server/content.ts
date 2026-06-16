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

export interface Article {
  slug: string;
  title: string;
  metaDescription: string;
  excerpt: string;
  image?: string;
  publishedAt?: string;
  updatedAt?: string;
  html?: string;
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
  return {
    slug: meta.slug || slug,
    title: meta.title || slug,
    metaDescription: meta.metaDescription || "",
    excerpt: meta.excerpt || "",
    image: meta.image || undefined,
    publishedAt: meta.publishedAt || undefined,
    updatedAt: meta.updatedAt || undefined,
    html: (marked.parse(body, { async: false }) as string).replace(/^<h1[^>]*>[\s\S]*?<\/h1>\s*/i, ""),
  };
}

export function listArticles(): Article[] {
  if (!existsSync(BLOG_DIR)) return [];
  return readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const a = getArticle(f.replace(/\.md$/, ""));
      return a ? { slug: a.slug, title: a.title, metaDescription: a.metaDescription, excerpt: a.excerpt, image: a.image, publishedAt: a.publishedAt, updatedAt: a.updatedAt } : null;
    })
    .filter(Boolean) as Article[];
}
