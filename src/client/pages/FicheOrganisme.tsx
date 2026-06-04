import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface OrganismeDetail {
  siret: string;
  nom: string;
  departement?: string | null;
  region?: string | null;
  formations: {
    numero_formation: string;
    intitule: string;
    prix_min?: number | null;
    prix_max?: number | null;
    a_distance?: number;
    categorie_nom?: string | null;
  }[];
}

export default function FicheOrganisme() {
  const { siret } = useParams();
  const { data: o, isLoading, isError } = useQuery<OrganismeDetail>({
    queryKey: [`/api/public/organismes/${siret}`],
  });

  if (isLoading) return <div className="max-w-4xl mx-auto px-4 py-12 text-gray-500">Chargement…</div>;
  if (isError || !o) return <div className="max-w-4xl mx-auto px-4 py-12 text-gray-500">Organisme introuvable.</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="card-naturo p-6">
        <h1 className="text-2xl font-bold text-dark" data-testid="text-organisme-nom">{o.nom}</h1>
        <p className="text-gray-600 mt-1">
          {[o.departement, o.region].filter(Boolean).join(" · ")}
        </p>
        <p className="text-sm text-gray-500 mt-2">SIRET {o.siret}</p>
      </div>

      <h2 className="font-bold text-lg text-dark mt-8 mb-4">
        {o.formations.length} formation{o.formations.length > 1 ? "s" : ""}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {o.formations.map((f) => (
          <Link
            key={f.numero_formation}
            href={`/formation/${encodeURIComponent(f.numero_formation)}`}
            className="card-naturo p-4 hover:border-primary/40 transition"
            data-testid={`link-formation-${f.numero_formation}`}
          >
            {f.categorie_nom && <span className="badge mb-2">{f.categorie_nom}</span>}
            <div className="font-semibold text-dark leading-snug">{f.intitule}</div>
            <div className="text-sm text-primary font-bold mt-2">
              {f.prix_min != null ? `${Math.round(f.prix_min).toLocaleString("fr-FR")} €` : "Prix sur demande"}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
