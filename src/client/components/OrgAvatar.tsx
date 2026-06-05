// Avatar d'initiales coloré (substitut de logo, déterministe par nom d'organisme).
function initials(name: string): string {
  const w = name.trim().split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? "") + (w[1]?.[0] ?? "")).toUpperCase() || "?";
}

const PALETTE = ["#186749", "#1b4332", "#0e7c5a", "#2d6a4f", "#40916c", "#52796f", "#2f6690", "#3a5a40"];

function color(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export default function OrgAvatar({ nom, size = 36 }: { nom: string; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, background: color(nom || "?"), fontSize: Math.round(size * 0.4) }}
      aria-hidden="true"
    >
      {initials(nom || "?")}
    </div>
  );
}
