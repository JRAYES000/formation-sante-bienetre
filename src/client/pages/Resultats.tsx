import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import SearchBar from "../components/SearchBar";
import Facets from "../components/Facets";
import FormationCard, { type FormationItem } from "../components/FormationCard";

interface SearchResponse {
  total: number;
  page: number;
  pages: number;
  items: FormationItem[];
  facets: {
    categories: { slug: string; nom: string; n: number }[];
    departements: { code: string; nom: string; n: number }[];
  };
}

export default function Resultats() {
  const params = useParams();
  const q = params.q ? decodeURIComponent(params.q) : "";

  const [categorie, setCategorie] = useState<string | undefined>(params.slug);
  const [dept, setDept] = useState<string | undefined>();
  const [distance, setDistance] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setCategorie(params.slug);
  }, [params.slug]);
  useEffect(() => {
    setPage(1);
  }, [q, categorie, dept, distance]);

  const { data, isLoading, isError } = useQuery<SearchResponse>({
    queryKey: [
      "/api/public/formations",
      { q: q || undefined, categorie, dept, distance: distance || undefined, page, pageSize: 12 },
    ],
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <SearchBar initial={q} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        <div>
          <label className="card-naturo p-4 flex items-center gap-2 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={distance}
              onChange={(e) => setDistance(e.target.checked)}
              data-testid="checkbox-distance"
            />
            <span className="text-sm font-medium text-dark">Formations à distance uniquement</span>
          </label>
          {data && (
            <Facets
              categories={data.facets.categories}
              departements={data.facets.departements}
              selCategorie={categorie}
              selDept={dept}
              onCategorie={setCategorie}
              onDept={setDept}
            />
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-bold text-lg text-dark" data-testid="text-results-count">
              {isLoading ? "Recherche…" : `${data?.total ?? 0} formation${(data?.total ?? 0) > 1 ? "s" : ""}`}
              {q && <span className="text-gray-500 font-normal"> pour « {q} »</span>}
            </h1>
          </div>

          {isError && <p className="text-red-600">Une erreur est survenue. Réessayez.</p>}
          {!isLoading && data?.items.length === 0 && (
            <p className="text-gray-500 card-naturo p-6">Aucune formation ne correspond. Élargissez vos critères.</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.items.map((f) => (
              <FormationCard key={f.numero_formation} f={f} />
            ))}
          </div>

          {data && data.pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="btn-primary !py-2 disabled:opacity-40"
                data-testid="button-page-prev"
              >
                Précédent
              </button>
              <span className="text-sm text-gray-600" data-testid="text-page">
                Page {data.page} / {data.pages}
              </span>
              <button
                disabled={page >= data.pages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-primary !py-2 disabled:opacity-40"
                data-testid="button-page-next"
              >
                Suivant
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
