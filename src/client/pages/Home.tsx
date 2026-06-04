import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import SearchBar from "../components/SearchBar";

interface Categorie {
  slug: string;
  nom: string;
  n: number;
}

export default function Home() {
  const { data: categories } = useQuery<Categorie[]>({ queryKey: ["/api/public/categories"] });

  return (
    <div>
      <section className="bg-surface border-b border-hairline">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-ink leading-tight tracking-tight">
            Trouvez votre formation <span className="text-primary">bien-être</span> financée par le CPF
          </h1>
          <p className="mt-4 text-body">
            Esthétique, massage bien-être, coiffure, soins… Comparez les organismes et demandez vos informations gratuitement.
          </p>
          <div className="mt-8">
            <SearchBar big />
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="font-bold text-xl text-dark mb-5">Explorer par métier</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {(categories ?? [])
            .filter((c) => c.n > 0)
            .map((c) => (
              <Link
                key={c.slug}
                href={`/categorie/${c.slug}`}
                className="card-naturo p-4 hover:border-primary/40 hover:shadow transition"
                data-testid={`link-categorie-${c.slug}`}
              >
                <div className="font-semibold text-dark">{c.nom}</div>
                <div className="text-sm text-gray-500">{c.n} formations</div>
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}
