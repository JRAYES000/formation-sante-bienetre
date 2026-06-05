import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

export default function SiteFooter() {
  const { data: metiers } = useQuery<{ slug: string; metier: string }[]>({ queryKey: ["/api/public/metiers"] });

  return (
    <footer className="border-t border-hairline mt-16 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="font-bold text-ink mb-3">Métiers</div>
          <ul className="space-y-1.5 text-gray-600">
            {(metiers ?? []).map((m) => (
              <li key={m.slug}>
                <a href={`/metier/${m.slug}`} className="hover:text-primary">{m.metier}</a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="font-bold text-ink mb-3">Ressources</div>
          <ul className="space-y-1.5 text-gray-600">
            <li><a href="/blog" className="hover:text-primary">Blog</a></li>
            <li><a href="/financement-cpf" className="hover:text-primary">Financement CPF</a></li>
            <li><a href="/formations" className="hover:text-primary">Toutes les formations</a></li>
            <li><a href="/metiers" className="hover:text-primary">Tous les métiers</a></li>
          </ul>
        </div>
        <div>
          <div className="font-bold text-ink mb-3">Explorer</div>
          <ul className="space-y-1.5 text-gray-600">
            <li><Link href="/recherche" className="hover:text-primary">Rechercher une formation</Link></li>
            <li><Link href="/comparer" className="hover:text-primary">Comparateur</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-bold text-ink mb-3">À propos</div>
          <p className="text-gray-500 text-xs leading-relaxed">
            Comparateur de formations CPF en esthétique, massage bien-être, coiffure et soins. Données issues du
            catalogue public Mon Compte Formation. Les demandes d'information sont transmises à des organismes
            partenaires avec votre consentement (RGPD).
          </p>
        </div>
      </div>
      <div className="border-t border-hairline">
        <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-muted flex flex-wrap gap-x-4 gap-y-1 justify-between">
          <span>© 2026 Formation Santé Bien-être</span>
          <span className="flex gap-4">
            <a href="/mentions-legales" className="hover:text-primary" data-testid="link-mentions">Mentions légales</a>
            <a href="/politique-confidentialite" className="hover:text-primary" data-testid="link-confidentialite">Politique de confidentialité</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
