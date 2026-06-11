import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": resolve(import.meta.dirname, "src/client") },
  },
  server: {
    port: 5173,
    proxy: {
      // L'API Express + les pages SEO SSR tournent sur 3001 (npm run serve)
      "/api": "http://localhost:3001",
      "/analytics.js": "http://localhost:3001",
      "/formations": "http://localhost:3001",
      "/sitemap.xml": "http://localhost:3001",
      "/robots.txt": "http://localhost:3001",
    },
  },
  build: { outDir: "dist/public", emptyOutDir: true },
});
