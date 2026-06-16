import { useState } from "react";
import React from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import LeadForm from "../components/LeadForm";
import FormationCard, { type FormationItem, fomoBadge, fomoViews } from "../components/FormationCard";

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
  organisme_qualiopi?: number;
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
  const [asked, setAsked] = useState(true);
  const { data: f, isLoading, isError } = useQuery<FormationDetail>({
    queryKey: [`/api/public/formations/${encodeURIComponent(numero!)}`],
  });
  const { data: similaires } = useQuery<FormationItem[]>({
    queryKey: [`/api/public/formations/${encodeURIComponent(numero!)}/similaires`],
  });

  if (isLoading) return <div className="max-w-4xl mx-auto px-4 py-12 text-gray-500">Chargement…</div>;
  if (isError || !f) return <div className="max-w-4xl mx-auto px-4 py-12 text-gray-500">Formation introuvable.</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/recherche" className="text-sm text-primary hover:underline">← Retour aux résultats</Link>

      <div className="card-naturo p-6 mt-4">
        {/* Catégorie + FOMO sur la même ligne */}
        {(() => {
          const fomo = fomoBadge(f.numero_formation);
          const views = fomoViews(f.numero_formation);
          return (
            <>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {f.categorie_nom && <span className="badge">{f.categorie_nom}</span>}
                {fomo && (
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${fomo.cls}`}>
                    {fomo.label}
                  </span>
                )}
                <span className="text-xs text-gray-500 flex items-center gap-1 ml-auto">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  {views} personnes cette semaine
                </span>
              </div>
            </>
          );
        })()}

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
          {f.organisme_qualiopi ? <span className="badge" data-testid="badge-qualiopi">Qualiopi</span> : null}
        </div>

        <p className="text-gray-400 text-xs mt-4 font-normal" data-testid="text-formation-prix">{prix(f)}</p>

        {/* CTA Voie B — formulaire de demande + routing partenaire */}
        <div className="mt-5 border-t border-gray-100 pt-5">
          <p className="text-xs text-gray-500 mb-4">Demande gratuite · Sans engagement · Réponse sous 24h</p>
          {!asked ? (
            <button onClick={() => setAsked(true)} className="btn-accent w-full sm:w-auto" data-testid="button-je-minforme">
              Je m'informe gratuitement
            </button>
          ) : (
            <LeadForm numeroFormation={f.numero_formation} />
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

      {similaires && similaires.length > 0 && (
        <div className="mt-8">
          <h2 className="font-bold text-lg text-ink mb-4">Formations similaires</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {similaires.map((s) => (
              <FormationCard key={s.numero_formation} f={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatText(text: string): React.ReactNode[] {
  return text.split(/\n+/).filter(Boolean).map((line, i) => {
    const trimmed = line.trim();
    // Lines that look like bullet points already (•, -, *, ·)
    const isBullet = /^[-•*·]/.test(trimmed);
    if (isBullet) {
      return (
        <li key={i} className="flex gap-2 text-gray-700 text-sm leading-relaxed">
          <span className="text-primary mt-0.5 shrink-0">–</span>
          <span>{trimmed.replace(/^[-•*·]\s*/, "")}</span>
        </li>
      );
    }
    // Short ALL-CAPS or colon-ending lines → treat as sub-heading
    if (trimmed.endsWith(":") || (trimmed === trimmed.toUpperCase() && trimmed.length < 60)) {
      return <p key={i} className="font-semibold text-dark text-sm mt-3">{trimmed}</p>;
    }
    return <p key={i} className="text-gray-700 text-sm leading-relaxed">{trimmed}</p>;
  });
}

function Section({ title, text }: { title: string; text: string }) {
  const nodes = formatText(text);
  const hasBullets = nodes.some((n) => (n as React.ReactElement).type === "li");
  return (
    <div className="pt-2">
      <h2 className="font-bold text-dark text-base mb-3">{title}</h2>
      {hasBullets ? (
        <ul className="space-y-2">{nodes}</ul>
      ) : (
        <div className="space-y-2">{nodes}</div>
      )}
    </div>
  );
}
