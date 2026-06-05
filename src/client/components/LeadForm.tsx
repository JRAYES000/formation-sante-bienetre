import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";

const BUDGETS = ["< 1 500 €", "1 500 – 3 000 €", "3 000 – 5 000 €", "> 5 000 €", "Je ne sais pas encore"];
const DELAIS = ["Dès que possible", "Sous 3 mois", "Sous 6 mois", "Je me renseigne"];
const FINANCEMENTS = ["CPF", "France Travail", "Employeur / OPCO", "Personnel", "À définir"];
const NIVEAUX = ["Débutant(e) / reconversion", "Quelques bases", "Déjà dans le métier"];

const inputCls = "rounded-[8px] border border-hairline px-4 py-2.5 focus:outline-none focus:border-ink bg-white";

export default function LeadForm({ numeroFormation }: { numeroFormation: string }) {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [budget, setBudget] = useState("");
  const [delai, setDelai] = useState("");
  const [financement, setFinancement] = useState("");
  const [niveau, setNiveau] = useState("");
  const [consent, setConsent] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/public/leads", {
        method: "POST",
        body: JSON.stringify({
          numeroFormation,
          nom,
          email,
          tel: tel || undefined,
          budget: budget || undefined,
          delai: delai || undefined,
          financement: financement || undefined,
          niveau: niveau || undefined,
          consentement: consent,
        }),
      }),
  });

  if (mutation.isSuccess) {
    return (
      <div className="bg-primary/5 rounded-naturo p-5 text-ink" data-testid="text-lead-success">
        ✅ <strong>Demande envoyée !</strong> Un conseiller vous recontactera rapidement avec les informations sur cette formation.
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (consent) mutation.mutate();
      }}
      className="space-y-3"
      data-testid="form-lead"
    >
      <h3 className="font-bold text-ink">Je m'informe gratuitement</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input required value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom et prénom" className={inputCls} data-testid="input-lead-nom" />
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={inputCls} data-testid="input-lead-email" />
      </div>
      <input value={tel} onChange={(e) => setTel(e.target.value)} placeholder="Téléphone (facultatif)" className={`w-full ${inputCls}`} data-testid="input-lead-tel" />

      <p className="text-xs text-muted pt-1">Pour mieux vous orienter (facultatif) :</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select value={financement} onChange={(e) => setFinancement(e.target.value)} className={inputCls} data-testid="select-lead-financement">
          <option value="">Mode de financement</option>
          {FINANCEMENTS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={budget} onChange={(e) => setBudget(e.target.value)} className={inputCls} data-testid="select-lead-budget">
          <option value="">Budget envisagé</option>
          {BUDGETS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={delai} onChange={(e) => setDelai(e.target.value)} className={inputCls} data-testid="select-lead-delai">
          <option value="">Délai de démarrage</option>
          {DELAIS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={niveau} onChange={(e) => setNiveau(e.target.value)} className={inputCls} data-testid="select-lead-niveau">
          <option value="">Niveau actuel</option>
          {NIVEAUX.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      <label className="flex items-start gap-2 text-sm text-gray-600">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" data-testid="checkbox-lead-consent" />
        <span>
          J'accepte que mes coordonnées soient transmises à l'organisme de formation et à ses partenaires afin d'être
          recontacté(e) au sujet de cette formation, conformément à la{" "}
          <a href="/politique-confidentialite" target="_blank" rel="noopener" className="text-primary underline">politique de confidentialité</a>.
        </span>
      </label>
      {mutation.isError && <p className="text-red-600 text-sm">Une erreur est survenue. Réessayez.</p>}
      <button type="submit" disabled={!consent || mutation.isPending} className="btn-accent w-full sm:w-auto disabled:opacity-40" data-testid="button-lead-submit">
        {mutation.isPending ? "Envoi…" : "Envoyer ma demande"}
      </button>
    </form>
  );
}
