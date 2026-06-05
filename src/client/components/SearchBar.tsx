import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface Dept {
  code: string;
  nom: string;
  n: number;
}

// Barre pilule double champ (métier + où) + orbe — inspirée Airbnb/maformation.
export default function SearchBar({ initial = "", initialDept = "", big = false }: { initial?: string; initialDept?: string; big?: boolean }) {
  const [q, setQ] = useState(initial);
  const [dept, setDept] = useState(initialDept);
  const [, navigate] = useLocation();
  const { data: depts } = useQuery<Dept[]>({ queryKey: ["/api/public/departements"] });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (dept) navigate(`/recherche/${encodeURIComponent(term || "-")}/${dept}`);
    else navigate(term ? `/recherche/${encodeURIComponent(term)}` : "/recherche");
  }

  return (
    <form
      onSubmit={submit}
      data-testid="form-search"
      className={`flex items-center gap-2 bg-white border border-hairline rounded-full shadow-airbnb ${big ? "p-2 pl-6" : "p-1.5 pl-5"}`}
    >
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Métier, certification… (massage, esthétique)"
        className={`flex-1 min-w-0 bg-transparent border-none outline-none text-ink placeholder:text-muted ${big ? "py-2 text-lg" : "py-1.5 text-sm"}`}
        data-testid="input-search"
      />
      <span className="hidden sm:block w-px h-7 bg-hairline shrink-0" />
      <select
        value={dept}
        onChange={(e) => setDept(e.target.value)}
        className={`hidden sm:block bg-transparent outline-none text-ink ${big ? "text-base max-w-[160px]" : "text-sm max-w-[130px]"}`}
        data-testid="select-search-dept"
        aria-label="Département"
      >
        <option value="">Partout</option>
        {(depts ?? []).map((d) => (
          <option key={d.code} value={d.code}>{d.nom}</option>
        ))}
      </select>
      <button
        type="submit"
        aria-label="Rechercher"
        className={`shrink-0 inline-flex items-center justify-center gap-2 bg-primary text-white rounded-full hover:bg-primary-active transition-colors ${big ? "h-12 px-6 font-medium" : "h-10 w-10"}`}
        data-testid="button-search-submit"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.5" y2="16.5" />
        </svg>
        {big && <span>Rechercher</span>}
      </button>
    </form>
  );
}
