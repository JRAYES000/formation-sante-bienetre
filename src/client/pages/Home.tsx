import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import SearchBar from "../components/SearchBar";
import TrustBar from "../components/TrustBar";
import Newsletter from "../components/Newsletter";
import FormationCard, { type FormationItem } from "../components/FormationCard";

interface Stats { formations: number; organismes: number; categories: number; qualiopi: number }
interface Cat { slug: string; nom: string; n: number }
interface Metier { slug: string; metier: string }
interface Ville { ville: string; slug: string; n: number }
interface Article { slug: string; title: string; excerpt: string; image?: string }

// Image de fond par métier : déposer le fichier dans public/images/.
// Si l'image est absente, la tuile reste affichée sur le vert de marque (dégradation gracieuse).
const metierBg = (slug: string) =>
  `linear-gradient(to top, rgba(0,0,0,.6), rgba(0,0,0,.12)), url(/images/metier-${slug}.webp)`;

// Covers de secours pour les tuiles "Conseils & guides" (un article peut surcharger via son frontmatter `image:`).
const CONSEIL_COVERS = ["/images/conseil-1.webp", "/images/conseil-2.webp", "/images/conseil-3.webp"];

// Photo par ville : /images/ville-{slug}.webp ; repli automatique sur ville-bg.webp si absente
// (les couches CSS s'empilent : la photo de ville couvre le fallback quand elle existe).
const villeBg = (slug: string) =>
  `linear-gradient(to top, rgba(27,67,50,.85), rgba(27,67,50,.2)), url(/images/ville-${slug}.webp), url(/images/ville-bg.webp)`;

export default function Home() {
  const { data: stats } = useQuery<Stats>({ queryKey: ["/api/public/stats"] });
  const { data: pop } = useQuery<{ items: FormationItem[] }>({ queryKey: ["/api/public/formations", { pageSize: 6 }] });
  const { data: cats } = useQuery<Cat[]>({ queryKey: ["/api/public/categories"] });
  const { data: metiers } = useQuery<Metier[]>({ queryKey: ["/api/public/metiers"] });
  const { data: villes } = useQuery<Ville[]>({ queryKey: ["/api/public/villes"] });
  const { data: articles } = useQuery<Article[]>({ queryKey: ["/api/public/articles"] });

  const count = stats ? stats.formations.toLocaleString("fr-FR") : "";

  return (
    <div>
      {/* HERO — image de fond (opacité ~45 %) + dégradé vert pour la lisibilité, texte blanc */}
      <section className="relative overflow-hidden border-b border-hairline">
        <div className="absolute inset-0 bg-primary-active" aria-hidden>
          <img
            src="/images/hero-bien-etre.webp"
            alt=""
            className="w-full h-full object-cover opacity-45"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-primary-active/75 via-primary-active/45 to-primary-active/75" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 py-10 sm:py-14 text-center">
          <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/25 backdrop-blur-sm">
            Le comparateur des formations bien-être finançables CPF
          </span>
          <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-white leading-[1.1] tracking-tight drop-shadow-sm">
            {count && <span className="text-[#17EC9B]">{count} formations bien-être</span>}
            <span className="block">et forcément la vôtre.</span>
          </h1>
          <p className="mt-3 text-white/90 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Esthétique, massage, coiffure, soins du corps : comparez les formations{" "}
            <strong className="font-semibold text-white">éligibles au CPF</strong> près de chez vous et choisissez en toute confiance.
          </p>
          <div className="mt-5"><SearchBar big /></div>
          <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-white/90">
            <li className="flex items-center gap-1.5"><span className="text-[#17EC9B] font-bold">✓</span> 100 % finançable CPF</li>
            <li className="flex items-center gap-1.5"><span className="text-[#17EC9B] font-bold">✓</span> Organismes certifiés Qualiopi</li>
            <li className="flex items-center gap-1.5"><span className="text-[#17EC9B] font-bold">✓</span> Gratuit et sans engagement</li>
          </ul>
        </div>
      </section>

      <TrustBar />

      {/* FORMATIONS POPULAIRES */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-xl text-ink">Formations populaires</h2>
          <Link href="/recherche" className="text-sm text-primary hover:underline">Voir tout →</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(pop?.items ?? []).map((f) => <FormationCard key={f.numero_formation} f={f} />)}
        </div>

        {/* Vignettes thématiques (par métier) → pages thématiques */}
        <h3 className="font-bold text-lg text-ink mt-10 mb-4">Parcourir par thématique</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {(metiers ?? []).map((m) => (
            <a
              key={m.slug}
              href={`/metier/${m.slug}`}
              data-testid={`tile-metier-${m.slug}`}
              className="group relative h-32 rounded-naturo overflow-hidden shadow-airbnb flex items-end bg-primary-active bg-cover bg-center transition-transform hover:-translate-y-0.5"
              style={{ backgroundImage: metierBg(m.slug) }}
            >
              <span className="relative p-3 text-white font-semibold text-sm leading-snug">{m.metier}</span>
            </a>
          ))}
        </div>
      </section>

      {/* CATEGORIES — thématiques recherchées */}
      <section className="bg-surface border-y border-hairline">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="font-bold text-xl text-ink mb-5">Thématiques recherchées</h2>
          <div className="flex flex-wrap gap-2">
            {(cats ?? []).filter((c) => c.n > 0).map((c) => (
              <Link key={c.slug} href={`/categorie/${c.slug}`} className="card-naturo px-4 py-2 text-sm text-ink hover:border-primary/40 transition" data-testid={`chip-cat-${c.slug}`}>
                {c.nom} <span className="text-muted">{c.n}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* LES FORMATIONS PAR VILLE */}
      {villes && villes.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-xl text-ink">Les formations par ville</h2>
            <a href="/villes" className="text-sm text-primary hover:underline">Toutes les villes →</a>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {villes.slice(0, 4).map((v) => (
              <a
                key={v.slug}
                href={`/ville/${v.slug}`}
                data-testid={`tile-ville-${v.slug}`}
                className="group relative h-36 rounded-naturo overflow-hidden shadow-airbnb flex items-end bg-primary bg-cover bg-center transition-transform hover:-translate-y-0.5"
                style={{ backgroundImage: villeBg(v.slug) }}
              >
                <span className="relative p-4 text-white">
                  <span className="block font-bold text-lg leading-tight">{v.ville}</span>
                  <span className="text-white/80 text-sm">{v.n} formations</span>
                </span>
              </a>
            ))}
          </div>
          {villes.length > 4 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {villes.slice(4, 24).map((v) => (
                <a key={v.slug} href={`/ville/${v.slug}`} className="card-naturo px-3 py-1.5 text-sm text-ink hover:border-primary/40 transition">
                  {v.ville}
                </a>
              ))}
            </div>
          )}
        </section>
      )}

      {/* BLOC CPF */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="bg-primary/5 border border-primary/20 rounded-naturo p-8 sm:flex items-center justify-between gap-6">
          <div>
            <h2 className="font-bold text-xl text-ink">Financez votre formation avec le CPF</h2>
            <p className="text-body mt-1">Jusqu'à 100 % pris en charge pour les formations certifiantes éligibles.</p>
          </div>
          <a href="/financement-cpf" className="btn-primary mt-4 sm:mt-0 shrink-0" data-testid="cta-cpf">En savoir plus</a>
        </div>
      </section>

      {/* CONSEILS & GUIDES — tuiles avec image de couverture */}
      {articles && articles.length > 0 && (
        <section className="bg-surface border-y border-hairline">
          <div className="max-w-6xl mx-auto px-4 py-12">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-xl text-ink">Conseils & guides</h2>
              <a href="/blog" className="text-sm text-primary hover:underline">Tous les articles →</a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {articles.slice(0, 3).map((a, i) => (
                <a key={a.slug} href={`/blog/${a.slug}`} className="card-naturo overflow-hidden hover:shadow-airbnb transition flex flex-col" data-testid={`tile-blog-${a.slug}`}>
                  <div
                    className="h-40 bg-primary-active bg-cover bg-center"
                    style={{ backgroundImage: `url(${a.image || CONSEIL_COVERS[i % CONSEIL_COVERS.length]})` }}
                    aria-hidden
                  />
                  <div className="p-5">
                    <div className="font-semibold text-ink leading-snug">{a.title}</div>
                    <p className="text-sm text-muted mt-2">{a.excerpt}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      <Newsletter />
    </div>
  );
}
