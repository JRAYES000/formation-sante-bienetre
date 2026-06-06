import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

export default function SiteFooter() {
  const { data: metiers } = useQuery<{ slug: string; metier: string }[]>({ queryKey: ["/api/public/metiers"] });

  return (
    <footer className="mt-16 bg-primary text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          {/* Marque */}
          <div className="col-span-2 md:col-span-1">
            <div className="text-lg font-bold">Formation Santé Bien-être</div>
            <p className="mt-3 text-white/70 text-xs leading-relaxed">
              Le comparateur de formations CPF en esthétique, massage bien-être, coiffure et soins. Données issues du
              catalogue public Mon Compte Formation.
            </p>
            <div className="mt-4 flex gap-3" aria-label="Réseaux sociaux">
              <a href="#" aria-label="Facebook" className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 transition flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H8v3h3v7h3v-7h2.5l.5-3H14V9z" /></svg>
              </a>
              <a href="#" aria-label="Instagram" className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 transition flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><line x1="17.5" y1="6.5" x2="17.5" y2="6.5" /></svg>
              </a>
              <a href="#" aria-label="LinkedIn" className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 transition flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6.94 7A1.94 1.94 0 105 5.06 1.94 1.94 0 006.94 7zM5.4 8.5h3.1V19H5.4zM10.4 8.5h3v1.4h.04c.42-.8 1.45-1.64 2.98-1.64 3.19 0 3.78 2.1 3.78 4.83V19h-3.1v-4.66c0-1.11-.02-2.54-1.55-2.54s-1.79 1.21-1.79 2.46V19h-3.1z" /></svg>
              </a>
            </div>
          </div>

          {/* Métiers */}
          <div>
            <div className="font-semibold mb-3">Métiers</div>
            <ul className="space-y-1.5 text-white/75">
              {(metiers ?? []).map((m) => (
                <li key={m.slug}>
                  <a href={`/metier/${m.slug}`} className="hover:text-white transition">{m.metier}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Ressources */}
          <div>
            <div className="font-semibold mb-3">Ressources</div>
            <ul className="space-y-1.5 text-white/75">
              <li><a href="/blog" className="hover:text-white transition">Conseils & guides</a></li>
              <li><a href="/financement-cpf" className="hover:text-white transition">Financement CPF</a></li>
              <li><a href="/formations" className="hover:text-white transition">Toutes les formations</a></li>
              <li><a href="/metiers" className="hover:text-white transition">Tous les métiers</a></li>
              <li><a href="/villes" className="hover:text-white transition">Par ville</a></li>
            </ul>
          </div>

          {/* Explorer */}
          <div>
            <div className="font-semibold mb-3">Explorer</div>
            <ul className="space-y-1.5 text-white/75">
              <li><Link href="/recherche" className="hover:text-white transition">Rechercher une formation</Link></li>
              <li><Link href="/comparer" className="hover:text-white transition">Comparateur</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/15 flex flex-wrap gap-x-4 gap-y-2 items-center justify-between text-xs text-white/70">
          <span>© 2026 Formation Santé Bien-être</span>
          <span className="flex gap-4">
            <a href="/mentions-legales" className="hover:text-white transition" data-testid="link-mentions">Mentions légales</a>
            <a href="/politique-confidentialite" className="hover:text-white transition" data-testid="link-confidentialite">Politique de confidentialité</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
