import { useQuery } from "@tanstack/react-query";

interface Stats {
  formations: number;
  organismes: number;
  categories: number;
  qualiopi: number;
}

export default function TrustBar() {
  const { data } = useQuery<Stats>({ queryKey: ["/api/public/stats"] });
  if (!data) return null;
  const items = [
    { n: data.formations.toLocaleString("fr-FR"), l: "formations CPF" },
    { n: data.organismes.toLocaleString("fr-FR"), l: "organismes" },
    { n: data.qualiopi.toLocaleString("fr-FR"), l: "certifiés Qualiopi" },
    { n: data.categories.toLocaleString("fr-FR"), l: "métiers" },
  ];
  return (
    <div className="border-b border-hairline bg-white">
      <div className="max-w-6xl mx-auto px-4 py-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center" data-testid="trust-bar">
        {items.map((it, i) => (
          <div key={i}>
            <div className="text-2xl font-bold text-primary">{it.n}</div>
            <div className="text-xs text-muted mt-0.5">{it.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
