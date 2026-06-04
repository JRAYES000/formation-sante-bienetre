/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/client/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#186749",
        accent: "#17EC9B",
        dark: "#1b4332",
      },
      borderRadius: { naturo: "15px" },
    },
  },
  plugins: [],
};
