import { Link } from "wouter";
import { useCompare } from "../lib/compare";
import type { FormationItem } from "../components/FormationCard";

const rows: [string, (f: FormationItem) => string][] = [
  ["Organisme", (f) => f.organisme ?? "—"],
  ["Prix", (f) => (f.prix_min != null ? `${Math.round(f.prix_min).toLocaleString("fr-FR")} €` : "Sur demande")],
  ["Modalité", (f) => (f.a_distance ? "À distance possible" : "Présentiel")],
  ["Certification", (f) => f.type_referentiel ?? "—"],
  ["Durée", (f) => (f.heures ? `${f.heures} h` : "—")],
  ["Niveau", (f) => f.niveau ?? "—"],
  ["Catégorie", (f) => f.categorie_nom ?? "—"],
];

export default function Comparer() {
  const { items, remove, clear } = useCompare();

  if (items.length === 0)
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-muted">Aucune formation sélectionnée pour la comparaison.</p>
        <Link href="/recherche" className="btn-primary mt-4 inline-flex">Rechercher des formations</Link>
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-bold text-xl text-ink">Comparer {items.length} formation{items.length > 1 ? "s" : ""}</h1>
        <button onClick={clear} className="text-sm text-primary hover:underline">Tout retirer</button>
      </div>
      <div className="overflow-x-auto card-naturo">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline">
              <th className="w-32"></th>
              {items.map((f) => (
                <th key={f.numero_formation} className="p-3 text-left align-top min-w-[180px]">
                  <Link href={`/formation/${encodeURIComponent(f.numero_formation)}`} className="font-semibold text-ink hover:text-primary block leading-snug">
                    {f.intitule}
                  </Link>
                  <button onClick={() => remove(f.numero_formation)} className="text-xs text-muted hover:text-primary mt-1">Retirer</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, fn]) => (
              <tr key={label} className="border-b border-hairline">
                <td className="p-3 font-medium text-muted whitespace-nowrap">{label}</td>
                {items.map((f) => (
                  <td key={f.numero_formation} className="p-3 text-ink">{fn(f)}</td>
                ))}
              </tr>
            ))}
            <tr>
              <td></td>
              {items.map((f) => (
                <td key={f.numero_formation} className="p-3">
                  <Link href={`/formation/${encodeURIComponent(f.numero_formation)}`} className="btn-accent !py-2 !px-3 text-xs">Je m'informe</Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
