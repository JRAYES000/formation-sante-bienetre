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
  qualification?: string | null;
}

function qualifSummary(raw?: string | null): string {
  if (!raw) return "";
  try {
    return Object.values(JSON.parse(raw) as Record<string, string>).filter(Boolean).join(" · ");
  } catch {
    return "";
  }
}

const STATUTS = ["nouveau", "contacte", "converti", "perdu"];

const TOKEN_KEY = "fsb_admin_token";

export default function Admin() {
  // « Rester connecté » : le mot de passe admin est mémorisé dans le navigateur
  // (exception assumée à la convention « pas de stockage client », demandée explicitement).
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_KEY) ?? "");
  const [entered, setEntered] = useState<boolean>(() => !!localStorage.getItem(TOKEN_KEY));

  const login = () => {
    if (!token) return;
    localStorage.setItem(TOKEN_KEY, token);
    setEntered(true);
  };
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setEntered(false);
  };

  if (!entered) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16">
        <h1 className="font-bold text-xl text-dark mb-4">Back-office</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            login();
          }}
          className="space-y-3"
        >
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Mot de passe admin"
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

  return (
    <>
      <NewsletterTable token={token} onLogout={logout} />
      <LeadsTable token={token} onLogout={logout} />
      <AvisModeration token={token} />
    </>
  );
}

interface Subscriber {
  email: string;
  created_at: string;
}

function NewsletterTable({ token, onLogout }: { token: string; onLogout: () => void }) {
  const auth = { headers: { Authorization: `Bearer ${token}` } };
  const { data: subs, isLoading, isError } = useQuery<Subscriber[]>({
    queryKey: ["admin-newsletter"],
    queryFn: () => apiRequest("/api/admin/newsletter", auth),
    retry: false,
  });

  const exportCsv = () => {
    if (!subs?.length) return;
    const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
    const csv =
      "email,date_inscription\n" +
      subs.map((s) => `${esc(s.email)},${esc(s.created_at)}`).join("\n");
    // BOM pour qu'Excel lise correctement les accents.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isError)
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-red-600 mb-4">Mot de passe invalide ou accès refusé.</p>
        <button onClick={onLogout} className="btn-primary">Réessayer</button>
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="font-bold text-xl text-dark">
          Inscrits newsletter{" "}
          {subs ? <span className="text-gray-400 font-normal">({subs.length})</span> : null}
        </h1>
        <div className="flex items-center gap-4">
          <button
            onClick={exportCsv}
            disabled={!subs?.length}
            className="btn-primary !py-2 !px-4 text-sm disabled:opacity-40"
            data-testid="button-export-newsletter"
          >
            ⬇ Exporter en CSV
          </button>
          <button onClick={onLogout} className="text-sm text-primary hover:underline">Se déconnecter</button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Chargement…</p>
      ) : subs && subs.length === 0 ? (
        <p className="text-gray-500 card-naturo p-6">Aucun inscrit pour l'instant.</p>
      ) : (
        <div className="card-naturo overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-3 py-2">Date d'inscription</th>
                <th className="px-3 py-2">Email</th>
              </tr>
            </thead>
            <tbody>
              {subs?.map((s) => (
                <tr key={s.email} className="border-t border-gray-100" data-testid={`row-sub-${s.email}`}>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{s.created_at.slice(0, 10)}</td>
                  <td className="px-3 py-2 text-dark">{s.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
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
                    {qualifSummary(l.qualification) && (
                      <div className="text-xs text-primary mt-1">{qualifSummary(l.qualification)}</div>
                    )}
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

interface AvisRow {
  id: number;
  siret: string;
  note: number;
  auteur?: string | null;
  commentaire?: string | null;
  statut: string;
  created_at: string;
}

function AvisModeration({ token }: { token: string }) {
  const qc = useQueryClient();
  const auth = { headers: { Authorization: `Bearer ${token}` } };
  const { data: avis } = useQuery<AvisRow[]>({
    queryKey: ["admin-avis"],
    queryFn: () => apiRequest("/api/admin/avis", auth),
    retry: false,
  });
  const mod = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: string }) =>
      apiRequest(`/api/admin/avis/${id}`, { method: "PATCH", ...auth, body: JSON.stringify({ statut }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-avis"] }),
  });
  if (!avis || avis.length === 0) return null;
  const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);
  return (
    <div className="max-w-6xl mx-auto px-4 pb-12">
      <h2 className="font-bold text-xl text-dark mb-4">Avis ({avis.length})</h2>
      <div className="card-naturo divide-y divide-gray-100">
        {avis.map((a) => (
          <div key={a.id} className="p-4 flex items-start justify-between gap-4" data-testid={`row-avis-${a.id}`}>
            <div>
              <div className="text-primary text-sm">
                {stars(a.note)} <span className="text-xs text-gray-400">· {a.statut}</span>
              </div>
              {a.auteur && <div className="text-sm font-medium text-dark">{a.auteur}</div>}
              {a.commentaire && <p className="text-sm text-gray-600">{a.commentaire}</p>}
              <div className="text-xs text-gray-400 mt-1">SIRET {a.siret} · {a.created_at?.slice(0, 10)}</div>
            </div>
            {a.statut === "en_attente" && (
              <div className="flex gap-2 shrink-0">
                <button onClick={() => mod.mutate({ id: a.id, statut: "publie" })} className="btn-primary !py-1.5 !px-3 text-xs" data-testid={`button-avis-publier-${a.id}`}>
                  Publier
                </button>
                <button onClick={() => mod.mutate({ id: a.id, statut: "rejete" })} className="text-xs text-gray-500 hover:text-red-600 border border-gray-200 rounded px-3">
                  Rejeter
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
