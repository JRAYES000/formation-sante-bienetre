import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import SearchBar from "../components/SearchBar";
import TrustBar from "../components/TrustBar";
import Newsletter from "../components/Newsletter";
import FormationCard, { type FormationItem } from "../components/FormationCard";

interface Stats { formations: number; organismes: number; categories: number; qualiopi: number }
interface Cat { slug: string; nom: string; n: number }
interface Dept { code: string; nom: string; n: number }
interface Metier { slug: string; metier: string }
interface Article { slug: string; title: string; excerpt: string }

export default function Home() {
  const { data: stats } = useQuery<Stats>({ queryKey: ["/api/public/stats"] });
  const { data: pop } = useQuery<{ items: FormationItem[] }>({ queryKey: ["/api/public/formations", { pageSize: 6 }] });
  const { data: cats } = useQuery<Cat[]>({ queryKey: ["/api/public/categories"] });
  const { data: depts } = useQuery<Dept[]>({ queryKey: ["/api/public/departements"] });
  const { data: metiers } = useQuery<Metier[]>({ queryKey: ["/api/public/metiers"] });
  const { data: articles } = useQuery<Article[]>({ queryKey: ["/api/public/articles"] });

  const count = stats ? stats.formations.toLocaleString("fr-FR") : "";

  return (
    <div>
      {/* HERO */}
      <section className="bg-surface border-b border-hairline">
        <div className="max-w-3xl mx-auto px-4 py-16 sm:py-20 text-center">
          <h1 className="text-3xl sm:text-5xl font-bold text-ink leading-tight tracking-tight">
            {count && <span className="text-primary">{count} formations bien-être</span>},<br className="hidden sm:block" /> et forcément la vôtre
          </h1>
          <p className="mt-4 text-body sm:text-lg">Esthétique, massage, coiffure, soins — financées par le CPF. Comparez les organismes.</p>
          <div className="mt-8"><SearchBar big /></div>
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
      </section>

      {/* METIERS */}
      <section className="bg-surface border-y border-hairline">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="font-bold text-xl text-ink mb-5">Explorer par métier</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {(metiers ?? []).map((m) => (
              <a key={m.slug} href={`/metier/${m.slug}`} className="card-naturo p-4 text-center hover:border-primary/40 transition" data-testid={`tile-metier-${m.slug}`}>
                <div className="font-semibold text-ink text-sm leading-snug">{m.metier}</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="font-bold text-xl text-ink mb-5">Tous les domaines</h2>
        <div className="flex flex-wrap gap-2">
          {(cats ?? []).filter((c) => c.n > 0).map((c) => (
            <Link key={c.slug} href={`/categorie/${c.slug}`} className="card-naturo px-4 py-2 text-sm text-ink hover:border-primary/40 transition" data-testid={`chip-cat-${c.slug}`}>
              {c.nom} <span className="text-muted">{c.n}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* DEPARTEMENTS */}
      <section className="bg-surface border-y border-hairline">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="font-bold text-xl text-ink mb-5">Se former près de chez vous</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(depts ?? []).slice(0, 8).map((d) => (
              <Link key={d.code} href={`/recherche/-/${d.code}`} className="card-naturo p-4 hover:border-primary/40 transition" data-testid={`tile-dept-${d.code}`}>
                <div className="font-semibold text-ink">{d.nom}</div>
                <div className="text-sm text-muted">{d.n} formations</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

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

      {/* BLOG */}
      {articles && articles.length > 0 && (
        <section className="bg-surface border-y border-hairline">
          <div className="max-w-6xl mx-auto px-4 py-12">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-xl text-ink">Conseils & guides</h2>
              <a href="/blog" className="text-sm text-primary hover:underline">Tous les articles →</a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {articles.slice(0, 3).map((a) => (
                <a key={a.slug} href={`/blog/${a.slug}`} className="card-naturo p-5 hover:shadow-airbnb transition" data-testid={`tile-blog-${a.slug}`}>
                  <div className="font-semibold text-ink leading-snug">{a.title}</div>
                  <p className="text-sm text-muted mt-2">{a.excerpt}</p>
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
