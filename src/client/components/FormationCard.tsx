import { Link } from "wouter";
import { useCompare } from "../lib/compare";
import OrgAvatar from "./OrgAvatar";

export interface FormationItem {
  numero_formation: string;
  intitule: string;
  intitule_certification?: string | null;
  type_referentiel?: string | null;
  niveau?: string | null;
  heures?: number | null;
  prix_min?: number | null;
  prix_max?: number | null;
  a_distance?: number;
  categorie_slug?: string | null;
  categorie_nom?: string | null;
  organisme?: string;
  organisme_qualiopi?: number;
  siret?: string;
}

function prixLabel(f: FormationItem): string {
  if (f.prix_min == null) return "Prix sur demande";
  const fmt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;
  if (f.prix_max && f.prix_max !== f.prix_min) return `${fmt(f.prix_min)} – ${fmt(f.prix_max)}`;
  return fmt(f.prix_min);
}

export default function FormationCard({ f }: { f: FormationItem }) {
  const { toggle, has } = useCompare();
  const inCompare = has(f.numero_formation);
  return (
    <div className="card-naturo p-5 flex flex-col gap-3" data-testid={`card-formation-${f.numero_formation}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          {f.categorie_nom && <span className="badge mb-2">{f.categorie_nom}</span>}
          <Link
            href={`/formation/${encodeURIComponent(f.numero_formation)}`}
            className="block font-bold text-dark hover:text-primary leading-snug"
            data-testid={`link-formation-${f.numero_formation}`}
          >
            {f.intitule}
          </Link>
          {f.organisme && (
            <div className="flex items-center gap-2 mt-1.5">
              <OrgAvatar nom={f.organisme} size={26} />
              <p className="text-sm text-gray-500">{f.organisme}</p>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-gray-600">
        {f.type_referentiel && <span className="bg-gray-100 rounded-full px-2 py-0.5">{f.type_referentiel}</span>}
        <span className="bg-gray-100 rounded-full px-2 py-0.5">{f.a_distance ? "À distance possible" : "Présentiel"}</span>
        {f.heures ? <span className="bg-gray-100 rounded-full px-2 py-0.5">{f.heures} h</span> : null}
        <span className="badge">CPF</span>
        {f.organisme_qualiopi ? <span className="badge">Qualiopi</span> : null}
      </div>
      <button
        onClick={() => toggle(f)}
        className={`self-start text-xs ${inCompare ? "text-primary font-semibold" : "text-muted"} hover:text-primary`}
        data-testid={`button-compare-${f.numero_formation}`}
      >
        {inCompare ? "✓ Dans le comparateur" : "+ Comparer"}
      </button>
      <div className="flex items-center justify-between mt-1">
        <span className="font-bold text-primary" data-testid={`text-prix-${f.numero_formation}`}>{prixLabel(f)}</span>
        <Link href={`/formation/${encodeURIComponent(f.numero_formation)}`} className="btn-accent !py-2 !px-4 text-sm">
          Je m'informe
        </Link>
      </div>
    </div>
  );
}
