interface Facet {
  slug?: string;
  code?: string;
  nom: string;
  n: number;
}

export default function Facets({
  categories,
  departements,
  selCategorie,
  selDept,
  onCategorie,
  onDept,
}: {
  categories: Facet[];
  departements: Facet[];
  selCategorie?: string;
  selDept?: string;
  onCategorie: (slug?: string) => void;
  onDept: (code?: string) => void;
}) {
  return (
    <aside className="space-y-6">
      <FacetBlock
        title="Métier"
        items={categories.map((c) => ({ key: c.slug!, label: c.nom, n: c.n }))}
        selected={selCategorie}
        onSelect={onCategorie}
        testid="facet-categorie"
      />
      <FacetBlock
        title="Département"
        items={departements.map((d) => ({ key: d.code!, label: d.nom, n: d.n }))}
        selected={selDept}
        onSelect={onDept}
        testid="facet-departement"
      />
    </aside>
  );
}

function FacetBlock({
  title,
  items,
  selected,
  onSelect,
  testid,
}: {
  title: string;
  items: { key: string; label: string; n: number }[];
  selected?: string;
  onSelect: (key?: string) => void;
  testid: string;
}) {
  return (
    <div className="card-naturo p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-sm text-dark">{title}</h3>
        {selected && (
          <button onClick={() => onSelect(undefined)} className="text-xs text-primary hover:underline" data-testid={`button-clear-${testid}`}>
            Effacer
          </button>
        )}
      </div>
      <ul className="space-y-1 max-h-64 overflow-auto pr-1">
        {items.slice(0, 20).map((it) => (
          <li key={it.key}>
            <button
              onClick={() => onSelect(selected === it.key ? undefined : it.key)}
              className={`w-full flex justify-between text-left text-sm rounded px-2 py-1 hover:bg-primary/5 ${
                selected === it.key ? "bg-primary/10 text-primary font-semibold" : "text-gray-700"
              }`}
              data-testid={`button-${testid}-${it.key}`}
            >
              <span className="truncate">{it.label}</span>
              <span className="text-gray-400 ml-2">{it.n}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
