import { useState } from "react";
import { useLocation } from "wouter";

export default function SearchBar({ initial = "", big = false }: { initial?: string; big?: boolean }) {
  const [q, setQ] = useState(initial);
  const [, navigate] = useLocation();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/recherche/${encodeURIComponent(term)}` : "/recherche");
  }

  return (
    <form onSubmit={submit} className={`flex gap-2 ${big ? "flex-col sm:flex-row" : ""}`} data-testid="form-search">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Métier, certification… (ex : massage bien-être, esthétique)"
        className={`flex-1 rounded-naturo border border-gray-200 px-4 ${big ? "py-4 text-lg" : "py-2.5"} focus:outline-none focus:ring-2 focus:ring-primary/40`}
        data-testid="input-search"
      />
      <button type="submit" className={big ? "btn-primary text-lg" : "btn-primary"} data-testid="button-search-submit">
        Rechercher
      </button>
    </form>
  );
}
