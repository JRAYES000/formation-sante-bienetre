/** @type {import('tailwindcss').Config} */
// Tokens issus de references/airbnb/DESIGN.md (Rausch, encre, hairlines, ombre signature).
export default {
  content: ["./index.html", "./src/client/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#186749", // vert Naturo — accent unique (CTA, orbe de recherche)
        "primary-active": "#1b4332", // vert foncé (hover/press)
        accent: "#186749",
        dark: "#222222", // ink — texte/titres (jamais noir pur)
        ink: "#222222",
        body: "#3f3f3f",
        muted: "#6a6a6a",
        hairline: "#dddddd",
        surface: "#f7f7f7",
      },
      borderRadius: { naturo: "14px" }, // rayon des cartes Airbnb (rounded.md)
      boxShadow: {
        airbnb: "rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px 0, rgba(0,0,0,0.1) 0 4px 8px 0",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
