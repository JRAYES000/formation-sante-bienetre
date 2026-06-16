import { Link } from "wouter";
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
  organisme_ville?: string | null;
  organisme_qualiopi?: number;
  siret?: string;
}

function prixLabel(f: FormationItem): string {
  if (f.prix_min == null) return "Prix sur demande";
  const fmt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;
  if (f.prix_max && f.prix_max !== f.prix_min) return `${fmt(f.prix_min)} – ${fmt(f.prix_max)}`;
  return fmt(f.prix_min);
}

// Deterministic pseudo-random number based on formation ID
export function fomoHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return h;
}

export function fomoViews(id: string): number {
  return 15 + (fomoHash(id) % 44);
}

// Exactly 1 FOMO badge per formation, or none. Only fires for top ~30% by hash.
// "Places X disponibles" is rare (1 in 5 eligible formations).
const FOMO_BADGES = [
  { label: "🎯 Forte demande ce mois-ci", cls: "bg-rose-50 border-rose-200 text-rose-600" },
  { label: "⚡ Places limitées", cls: "bg-red-50 border-red-200 text-red-600" },
  { label: "🔥 Très demandée", cls: "bg-orange-50 border-orange-200 text-orange-600" },
  { label: "🎯 Forte demande ce mois-ci", cls: "bg-rose-50 border-rose-200 text-rose-600" },
  { label: "⚡ Places limitées", cls: "bg-red-50 border-red-200 text-red-600" },
  { label: "🔥 Très demandée", cls: "bg-orange-50 border-orange-200 text-orange-600" },
  { label: "🎯 Forte demande ce mois-ci", cls: "bg-rose-50 border-rose-200 text-rose-600" },
  { label: "⚡ Places limitées", cls: "bg-red-50 border-red-200 text-red-600" },
  { label: "🔥 Très demandée", cls: "bg-orange-50 border-orange-200 text-orange-600" },
  // Rare: specific seat count (1 in 10 eligible)
  { label: "⚡ 3 places disponibles", cls: "bg-red-50 border-red-200 text-red-700" },
  { label: "⚡ 5 places disponibles", cls: "bg-red-50 border-red-200 text-red-700" },
  { label: "⚡ 4 places disponibles", cls: "bg-red-50 border-red-200 text-red-700" },
];

export function fomoBadge(id: string): { label: string; cls: string } | null {
  const h = fomoHash(id);
  // Activate for ~30% of formations (h % 10 >= 7)
  if (h % 10 < 7) return null;
  return FOMO_BADGES[h % FOMO_BADGES.length];
}

export default function FormationCard({ f }: { f: FormationItem }) {
  const views = fomoViews(f.numero_formation);
  const fomo = fomoBadge(f.numero_formation);

  return (
    <div
      className="card-naturo flex flex-col gap-0 overflow-hidden hover:shadow-airbnb transition-shadow"
      data-testid={`card-formation-${f.numero_formation}`}
    >
      {/* Bande colorée en haut + badge FOMO si populaire */}
      <div className="h-1.5 w-full bg-gradient-to-r from-primary to-primary-active" />

      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Catégorie + badges FOMO */}
        <div className="flex flex-wrap gap-1.5">
          {f.categorie_nom && <span className="badge">{f.categorie_nom}</span>}
          {fomo && (
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${fomo.cls}`}>
              {fomo.label}
            </span>
          )}
        </div>

        {/* Titre + organisme */}
        <div>
          <Link
            href={`/formation/${encodeURIComponent(f.numero_formation)}`}
            className="block font-bold text-dark hover:text-primary leading-snug text-[15px]"
            data-testid={`link-formation-${f.numero_formation}`}
          >
            {f.intitule}
          </Link>
          {f.organisme && (
            <div className="flex items-center gap-2 mt-1.5">
              <OrgAvatar nom={f.organisme} size={24} />
              <p className="text-sm text-gray-500">
                {f.organisme}
                {f.organisme_ville ? (
                  <span className="text-muted"> · <span className="capitalize">{f.organisme_ville.toLowerCase()}</span></span>
                ) : null}
              </p>
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 text-xs text-gray-600">
          {f.type_referentiel && <span className="bg-gray-100 rounded-full px-2.5 py-0.5">{f.type_referentiel}</span>}
          <span className="bg-gray-100 rounded-full px-2.5 py-0.5">{f.a_distance ? "À distance" : "Présentiel"}</span>
          {f.heures ? <span className="bg-gray-100 rounded-full px-2.5 py-0.5">{f.heures} h</span> : null}
          <span className="badge">CPF</span>
          {f.organisme_qualiopi ? <span className="badge">Qualiopi ✓</span> : null}
        </div>

        {/* FOMO social proof */}
        <p className="text-[11px] text-muted flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          {views} personnes ont consulté cette semaine
        </p>

        {/* Séparateur */}
        <div className="border-t border-hairline" />

        {/* Prix + CTA */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-gray-400 text-xs font-normal" data-testid={`text-prix-${f.numero_formation}`}>
              {prixLabel(f)}
            </span>
            {f.prix_min != null && (
              <span className="block text-[10px] text-muted">finançable CPF</span>
            )}
          </div>
          <Link
            href={`/formation/${encodeURIComponent(f.numero_formation)}`}
            className="btn-accent !py-2 !px-5 text-sm shrink-0"
          >
            Je m'informe →
          </Link>
        </div>

      </div>
    </div>
  );
}
