import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";

interface AvisData {
  note: number | null;
  count: number;
  items: { id: number; note: number; auteur?: string | null; commentaire?: string | null; created_at: string }[];
}

const stars = (n: number) => "★".repeat(Math.max(0, Math.min(5, n))) + "☆".repeat(5 - Math.max(0, Math.min(5, n)));

export default function OrganismeAvis({ siret }: { siret: string }) {
  const { data } = useQuery<AvisData>({ queryKey: [`/api/public/organismes/${siret}/avis`] });
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(5);
  const [auteur, setAuteur] = useState("");
  const [commentaire, setCommentaire] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/public/avis", {
        method: "POST",
        body: JSON.stringify({ siret, note, auteur: auteur || undefined, commentaire: commentaire || undefined }),
      }),
  });

  return (
    <div className="card-naturo p-6 mt-4" data-testid="organisme-avis">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-ink">Avis</h2>
        <button onClick={() => setOpen((o) => !o)} className="text-sm text-primary hover:underline" data-testid="button-laisser-avis">
          Laisser un avis
        </button>
      </div>

      {data && data.count > 0 ? (
        <>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-primary text-lg">{stars(Math.round(data.note ?? 0))}</span>
            <span className="text-sm text-muted">{data.note}/5 · {data.count} avis</span>
          </div>
          <div className="space-y-3">
            {data.items.map((a) => (
              <div key={a.id} className="border-t border-hairline pt-3">
                <div className="text-primary text-sm">{stars(a.note)}</div>
                {a.auteur && <div className="text-sm font-medium text-ink">{a.auteur}</div>}
                {a.commentaire && <p className="text-sm text-body">{a.commentaire}</p>}
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted">Aucun avis pour le moment. Soyez le premier à en laisser un !</p>
      )}

      {open &&
        (mutation.isSuccess ? (
          <p className="text-sm bg-primary/5 rounded-naturo p-3 mt-4" data-testid="text-avis-success">
            Merci ! Votre avis sera publié après modération.
          </p>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="mt-4 space-y-2 border-t border-hairline pt-4" data-testid="form-avis">
            <select value={note} onChange={(e) => setNote(Number(e.target.value))} className="rounded-[8px] border border-hairline px-3 py-2 text-sm bg-white" data-testid="select-avis-note">
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{stars(n)} ({n}/5)</option>
              ))}
            </select>
            <input value={auteur} onChange={(e) => setAuteur(e.target.value)} placeholder="Votre prénom (facultatif)" className="w-full rounded-[8px] border border-hairline px-3 py-2 text-sm" data-testid="input-avis-auteur" />
            <textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder="Votre avis" rows={3} className="w-full rounded-[8px] border border-hairline px-3 py-2 text-sm" data-testid="input-avis-commentaire" />
            {mutation.isError && <p className="text-red-600 text-sm">Une erreur est survenue.</p>}
            <button type="submit" disabled={mutation.isPending} className="btn-primary !py-2 text-sm disabled:opacity-40" data-testid="button-avis-submit">
              {mutation.isPending ? "Envoi…" : "Publier mon avis"}
            </button>
          </form>
        ))}
    </div>
  );
}
