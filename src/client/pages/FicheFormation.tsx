import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface FormationDetail {
  numero_formation: string;
  intitule: string;
  intitule_certification?: string | null;
  type_referentiel?: string | null;
  niveau?: string | null;
  heures?: number | null;
  prix_min?: number | null;
  prix_max?: number | null;
  a_distance?: number;
  objectif?: string | null;
  contenu?: string | null;
  points_forts?: string | null;
  siret?: string;
  organisme?: string;
  organisme_dept?: string | null;
  categorie_nom?: string | null;
  departements: { code: string; nom: string; region?: string }[];
}

function prix(f: FormationDetail) {
  if (f.prix_min == null) return "Prix sur demande";
  const fmt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;
  return f.prix_max && f.prix_max !== f.prix_min ? `${fmt(f.prix_min)} – ${fmt(f.prix_max)}` : fmt(f.prix_min);
}

export default function FicheFormation() {
  const { numero } = useParams();
  const [asked, setAsked] = useState(false);
  const { data: f, isLoading, isError } = useQuery<FormationDetail>({
    queryKey: [`/api/public/formations/${encodeURIComponent(numero!)}`],
  });

  if (isLoading) return <div className="max-w-4xl mx-auto px-4 py-12 text-gray-500">Chargement…</div>;
  if (isError || !f) return <div className="max-w-4xl mx-auto px-4 py-12 text-gray-500">Formation introuvable.</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/recherche" className="text-sm text-primary hover:underline">← Retour aux résultats</Link>

      <div className="card-naturo p-6 mt-4">
        {f.categorie_nom && <span className="badge mb-3">{f.categorie_nom}</span>}
        <h1 className="text-2xl font-bold text-dark" data-testid="text-formation-titre">{f.intitule}</h1>
        {f.organisme && (
          <p className="text-gray-600 mt-1">
            par{" "}
            <Link href={`/organisme/${f.siret}`} className="text-primary hover:underline" data-testid="link-organisme">
              {f.organisme}
            </Link>
          </p>
        )}

        <div className="flex flex-wrap gap-2 mt-4 text-sm">
          {f.type_referentiel && <span className="bg-gray-100 rounded-full px-3 py-1">{f.type_referentiel}</span>}
          <span className="bg-gray-100 rounded-full px-3 py-1">{f.a_distance ? "À distance possible" : "Présentiel"}</span>
          {f.heures ? <span className="bg-gray-100 rounded-full px-3 py-1">{f.heures} heures</span> : null}
          {f.niveau && <span className="bg-gray-100 rounded-full px-3 py-1">{f.niveau}</span>}
          <span className="badge">Éligible CPF</span>
        </div>

        <p className="text-2xl font-bold text-primary mt-5" data-testid="text-formation-prix">{prix(f)}</p>

        {/* CTA Voie B — le formulaire de demande arrive au Lot 4 */}
        <div className="mt-6 border-t border-gray-100 pt-6">
          {!asked ? (
            <button onClick={() => setAsked(true)} className="btn-accent w-full sm:w-auto" data-testid="button-je-minforme">
              Je m'informe gratuitement
            </button>
          ) : (
            <div className="bg-primary/5 rounded-naturo p-4 text-sm text-dark" data-testid="text-lead-placeholder">
              ✅ Formulaire de demande d'information <strong>(Lot 4)</strong> : nom, email, téléphone + consentement RGPD,
              puis routage du lead vers École Naturo / partenaires. À implémenter à l'étape suivante.
            </div>
          )}
        </div>
      </div>

      {(f.objectif || f.contenu || f.points_forts) && (
        <div className="card-naturo p-6 mt-4 space-y-4">
          {f.points_forts && <Section title="Points forts" text={f.points_forts} />}
          {f.objectif && <Section title="Objectifs" text={f.objectif} />}
          {f.contenu && <Section title="Contenu" text={f.contenu} />}
        </div>
      )}

      {f.departements?.length > 0 && (
        <div className="card-naturo p-6 mt-4">
          <h2 className="font-bold text-dark mb-3">Disponible dans {f.departements.length} département(s)</h2>
          <div className="flex flex-wrap gap-2">
            {f.departements.map((d) => (
              <span key={d.code} className="bg-gray-100 rounded-full px-3 py-1 text-sm" data-testid={`dept-${d.code}`}>
                {d.nom}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h2 className="font-bold text-dark mb-1">{title}</h2>
      <p className="text-gray-700 whitespace-pre-line text-sm leading-relaxed">{text}</p>
    </div>
  );
}
