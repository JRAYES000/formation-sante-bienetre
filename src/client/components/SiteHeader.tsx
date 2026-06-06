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
    <header className="bg-white border-b border-hairline sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-primary text-lg shrink-0" data-testid="link-home">
          <span className="text-2xl">🌿</span>
          <span className="hidden sm:inline">Formation Santé Bien-être</span>
        </Link>

        <nav className="flex items-center gap-4 sm:gap-5 text-sm text-gray-700">
          <div className="relative">
            <button
              onClick={() => setOpen((o) => !o)}
              className="hover:text-primary flex items-center gap-1"
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
          <a href="/metiers" className="hover:text-primary hidden sm:inline" data-testid="nav-metiers">Métiers</a>
          <a href="/blog" className="hover:text-primary hidden sm:inline" data-testid="nav-blog">Blog</a>
          <a href="/financement-cpf" className="hover:text-primary hidden md:inline" data-testid="nav-cpf">CPF</a>
          <Link href="/recherche" className="btn-primary !py-2 !px-4 text-sm" data-testid="nav-rechercher">Rechercher</Link>
          <Link href="/admin" className="text-gray-400 hover:text-primary text-xs hidden sm:inline" data-testid="nav-admin" title="Espace administrateur">Admin</Link>
        </nav>
      </div>
    </header>
  );
}
