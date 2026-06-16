import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface Cat {
  slug: string;
  nom: string;
  n: number;
}

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { data: cats } = useQuery<Cat[]>({ queryKey: ["/api/public/categories"] });

  return (
    <header className="sticky top-0 z-30" style={{ background: "var(--color-primary, #186749)", borderBottom: "1px solid rgba(0,0,0,.12)" }}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="shrink-0 flex items-center gap-2" data-testid="link-home">
          <img
            src="/images/logo-header.png"
            alt="Formation Santé Bien-être"
            className="h-9 w-auto"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.removeAttribute("hidden"); }}
          />
          <span hidden className="text-white font-bold text-lg">🌿 Formation Santé Bien-être</span>
        </Link>

        <nav className="flex items-center gap-4 sm:gap-5 text-sm" style={{ color: "rgba(255,255,255,.92)" }}>
          <div className="relative">
            <button
              onClick={() => setOpen((o) => !o)}
              className="hover:text-white flex items-center gap-1"
              data-testid="button-categories-menu"
            >
              Catégories <span className="text-xs">▾</span>
            </button>
            {open && (
              <div
                className="absolute left-0 mt-2 w-64 max-h-[70vh] overflow-auto card-naturo shadow-airbnb p-2 z-40"
                onMouseLeave={() => setOpen(false)}
              >
                {(cats ?? [])
                  .filter((c) => c.n > 0)
                  .map((c) => (
                    <Link
                      key={c.slug}
                      href={`/categorie/${c.slug}`}
                      onClick={() => setOpen(false)}
                      className="flex justify-between px-3 py-1.5 rounded hover:bg-primary/5 text-gray-700"
                      data-testid={`menu-cat-${c.slug}`}
                    >
                      <span className="truncate">{c.nom}</span>
                      <span className="text-gray-400 ml-2">{c.n}</span>
                    </Link>
                  ))}
              </div>
            )}
          </div>
          <a href="/metiers" className="hover:text-white hidden sm:inline" data-testid="nav-metiers">Métiers</a>
          <a href="/blog" className="hover:text-white hidden sm:inline" data-testid="nav-blog">Blog</a>
          <a href="/financement-cpf" className="hover:text-white hidden md:inline" data-testid="nav-cpf">CPF</a>
          <Link href="/recherche" className="btn-primary !py-2 !px-4 text-sm" data-testid="nav-rechercher">Rechercher</Link>
        </nav>
      </div>
    </header>
  );
}
