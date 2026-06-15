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
    niveaux: { nom: string; n: number }[];
    types: { nom: string; n: number }[];
  };
}

export default function Resultats() {
  const params = useParams();
  const q = params.q && params.q !== "-" ? decodeURIComponent(params.q) : "";

  const [categorie, setCategorie] = useState<string | undefined>(params.slug);
  const [dept, setDept] = useState<string | undefined>(params.dept);
  const [distance, setDistance] = useState(false);
  const [prixMax, setPrixMax] = useState<string>("");
  const [niveau, setNiveau] = useState<string | undefined>();
  const [type, setType] = useState<string | undefined>();
  const [sort, setSort] = useState<string>("pertinence");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setCategorie(params.slug);
  }, [params.slug]);
  useEffect(() => {
    setDept(params.dept);
  }, [params.dept]);
  useEffect(() => {
    setPage(1);
  }, [q, categorie, dept, distance, prixMax, niveau, type, sort]);

  const { data, isLoading, isError } = useQuery<SearchResponse>({
    queryKey: [
      "/api/public/formations",
      {
        q: q || undefined,
        categorie,
        dept,
        distance: distance || undefined,
        prixMax: prixMax ? Number(prixMax) : undefined,
        niveau,
        type,
        sort: sort !== "pertinence" ? sort : undefined,
        page,
        pageSize: 12,
      },
    ],
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <SearchBar initial={q} initialDept={dept ?? ""} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        <div className="space-y-6">
          {/* Filtres rapides */}
          <div className="card-naturo p-4 space-y-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={distance} onChange={(e) => setDistance(e.target.checked)} data-testid="checkbox-distance" />
              <span className="text-sm font-medium text-ink">À distance uniquement</span>
            </label>

            <div>
              <label className="block text-sm font-bold text-ink mb-1">Budget max (€)</label>
              <input
                type="number"
                min={0}
                value={prixMax}
                onChange={(e) => setPrixMax(e.target.value)}
                placeholder="ex : 3000"
                className="w-full rounded-[8px] border border-hairline px-3 py-2 text-sm focus:outline-none focus:border-ink"
                data-testid="input-prix-max"
              />
            </div>

            {data && data.facets.types.length > 0 && (
              <div>
                <label className="block text-sm font-bold text-ink mb-1">Type de certification</label>
                <select
                  value={type ?? ""}
                  onChange={(e) => setType(e.target.value || undefined)}
                  className="w-full rounded-[8px] border border-hairline px-3 py-2 text-sm bg-white"
                  data-testid="select-type"
                >
                  <option value="">Tous</option>
                  {data.facets.types.map((t) => (
                    <option key={t.nom} value={t.nom}>
                      {t.nom} ({t.n})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {data && data.facets.niveaux.length > 0 && (
              <div>
                <label className="block text-sm font-bold text-ink mb-1">Niveau</label>
                <select
                  value={niveau ?? ""}
                  onChange={(e) => setNiveau(e.target.value || undefined)}
                  className="w-full rounded-[8px] border border-hairline px-3 py-2 text-sm bg-white"
                  data-testid="select-niveau"
                >
                  <option value="">Tous</option>
                  {data.facets.niveaux.map((n) => (
                    <option key={n.nom} value={n.nom}>
                      {n.nom} ({n.n})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

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
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h1 className="font-bold text-lg text-ink" data-testid="text-results-count">
              {isLoading ? "Recherche…" : `${data?.total ?? 0} formation${(data?.total ?? 0) > 1 ? "s" : ""}`}
              {q && <span className="text-muted font-normal"> pour « {q} »</span>}
            </h1>
            <label className="flex items-center gap-2 text-sm text-muted">
              Trier&nbsp;:
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-[8px] border border-hairline px-2 py-1.5 text-sm bg-white text-ink"
                data-testid="select-sort"
              >
                <option value="pertinence">Pertinence</option>
                <option value="prix_asc">Prix croissant</option>
                <option value="prix_desc">Prix décroissant</option>
              </select>
            </label>
          </div>

          {isError && <p className="text-red-600">Une erreur est survenue. Réessayez.</p>}
          {!isLoading && data?.items.length === 0 && (
            <p className="text-muted card-naturo p-6">Aucune formation ne correspond. Élargissez vos critères.</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data?.items.map((f) => (
              <FormationCard key={f.numero_formation} f={f} />
            ))}
          </div>

          {data && data.pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-primary !py-2 disabled:opacity-40" data-testid="button-page-prev">
                Précédent
              </button>
              <span className="text-sm text-muted" data-testid="text-page">
                Page {data.page} / {data.pages}
              </span>
              <button disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} className="btn-primary !py-2 disabled:opacity-40" data-testid="button-page-next">
                Suivant
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
