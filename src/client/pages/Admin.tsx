import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";

interface Lead {
  id: number;
  nom: string;
  email: string;
  tel?: string | null;
  statut: string;
  created_at: string;
  formation?: string | null;
  partenaire?: string | null;
}

const STATUTS = ["nouveau", "contacte", "converti", "perdu"];

export default function Admin() {
  // Token gardé en mémoire (pas de localStorage — convention naturo-pro). Re-saisie au reload.
  const [token, setToken] = useState<string>("");
  const [entered, setEntered] = useState(false);

  if (!entered) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16">
        <h1 className="font-bold text-xl text-dark mb-4">Back-office</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (token) setEntered(true);
          }}
          className="space-y-3"
        >
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Token d'accès"
            className="w-full rounded-naturo border border-gray-200 px-4 py-2.5"
            data-testid="input-admin-token"
          />
          <button type="submit" className="btn-primary w-full" data-testid="button-admin-login">
            Entrer
          </button>
        </form>
      </div>
    );
  }

  return <LeadsTable token={token} onLogout={() => setEntered(false)} />;
}

function LeadsTable({ token, onLogout }: { token: string; onLogout: () => void }) {
  const qc = useQueryClient();
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  const { data: leads, isLoading, isError } = useQuery<Lead[]>({
    queryKey: ["admin-leads"],
    queryFn: () => apiRequest("/api/admin/leads", auth),
    retry: false,
  });

  const setStatut = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: string }) =>
      apiRequest(`/api/admin/leads/${id}`, { method: "PATCH", ...auth, body: JSON.stringify({ statut }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-leads"] }),
  });

  if (isError)
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-red-600 mb-4">Token invalide ou accès refusé.</p>
        <button onClick={onLogout} className="btn-primary">Réessayer</button>
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-bold text-xl text-dark">
          Leads {leads ? <span className="text-gray-400 font-normal">({leads.length})</span> : null}
        </h1>
        <button onClick={onLogout} className="text-sm text-primary hover:underline">Se déconnecter</button>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Chargement…</p>
      ) : leads && leads.length === 0 ? (
        <p className="text-gray-500 card-naturo p-6">Aucun lead pour l'instant.</p>
      ) : (
        <div className="card-naturo overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2">Formation</th>
                <th className="px-3 py-2">Partenaire</th>
                <th className="px-3 py-2">Statut</th>
              </tr>
            </thead>
            <tbody>
              {leads?.map((l) => (
                <tr key={l.id} className="border-t border-gray-100" data-testid={`row-lead-${l.id}`}>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{l.created_at.slice(0, 10)}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-dark">{l.nom}</div>
                    <div className="text-gray-500">{l.email}</div>
                    {l.tel && <div className="text-gray-400">{l.tel}</div>}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{l.formation ?? "—"}</td>
                  <td className="px-3 py-2 text-gray-600">{l.partenaire ?? "—"}</td>
                  <td className="px-3 py-2">
                    <select
                      value={l.statut}
                      onChange={(e) => setStatut.mutate({ id: l.id, statut: e.target.value })}
                      className="rounded border border-gray-200 px-2 py-1"
                      data-testid={`select-statut-${l.id}`}
                    >
                      {STATUTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
