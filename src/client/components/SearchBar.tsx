import { useState } from "react";
import { useLocation } from "wouter";

// Barre de recherche pilule + orbe Rausch (signature Airbnb — references/airbnb/DESIGN.md).
export default function SearchBar({ initial = "", big = false }: { initial?: string; big?: boolean }) {
  const [q, setQ] = useState(initial);
  const [, navigate] = useLocation();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/recherche/${encodeURIComponent(term)}` : "/recherche");
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
        placeholder="Métier, certification… (ex : massage bien-être, esthétique)"
        className={`flex-1 bg-transparent border-none outline-none text-ink placeholder:text-muted ${big ? "py-2 text-lg" : "py-1.5 text-sm"}`}
        data-testid="input-search"
      />
      <button
        type="submit"
        aria-label="Rechercher"
        className={`shrink-0 inline-flex items-center justify-center gap-2 bg-primary text-white rounded-full hover:bg-primary-active transition-colors ${
          big ? "h-12 px-6 font-medium" : "h-10 w-10"
        }`}
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
