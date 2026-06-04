import { createContext, useContext, useState, type ReactNode } from "react";
import { Link } from "wouter";
import type { FormationItem } from "../components/FormationCard";

// Sélection de formations à comparer — état en mémoire (pas de localStorage).
interface CompareCtx {
  items: FormationItem[];
  toggle: (i: FormationItem) => void;
  remove: (numero: string) => void;
  clear: () => void;
  has: (numero: string) => boolean;
}

const MAX = 4;
const Ctx = createContext<CompareCtx | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<FormationItem[]>([]);
  const has = (n: string) => items.some((i) => i.numero_formation === n);
  const toggle = (i: FormationItem) =>
    setItems((prev) =>
      prev.some((x) => x.numero_formation === i.numero_formation)
        ? prev.filter((x) => x.numero_formation !== i.numero_formation)
        : prev.length >= MAX
        ? prev
        : [...prev, i]
    );
  const remove = (n: string) => setItems((prev) => prev.filter((x) => x.numero_formation !== n));
  const clear = () => setItems([]);
  return <Ctx.Provider value={{ items, toggle, remove, clear, has }}>{children}</Ctx.Provider>;
}

export function useCompare(): CompareCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCompare doit être utilisé dans CompareProvider");
  return c;
}

// Barre flottante en bas dès qu'au moins 1 formation est sélectionnée.
export function CompareBar() {
  const { items, clear } = useCompare();
  if (items.length === 0) return null;
  return (
    <div className="fixed bottom-0 inset-x-0 bg-ink text-white z-20 shadow-airbnb" data-testid="compare-bar">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <span className="text-sm">
          {items.length} formation{items.length > 1 ? "s" : ""} sélectionnée{items.length > 1 ? "s" : ""} (max {MAX})
        </span>
        <div className="flex items-center gap-3">
          <button onClick={clear} className="text-sm opacity-80 hover:opacity-100" data-testid="button-compare-clear">Vider</button>
          <Link href="/comparer" className="bg-primary rounded-[8px] px-4 py-2 text-sm font-medium" data-testid="link-comparer">Comparer →</Link>
        </div>
      </div>
    </div>
  );
}
