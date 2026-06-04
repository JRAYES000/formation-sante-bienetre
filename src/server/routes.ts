// Routes publiques (sans auth). Préfixe /api/public. Aucune SQL ici : tout via storage.
import { Router } from "express";
import { z } from "zod";
import {
  searchFormations,
  getFormation,
  getOrganisme,
  listCategories,
  listDepartements,
} from "./storage.ts";

export const publicRouter = Router();

const searchSchema = z.object({
  q: z.string().trim().max(120).optional(),
  categorie: z.string().trim().max(120).optional(),
  dept: z.string().trim().max(8).optional(),
  distance: z.coerce.boolean().optional(),
  prixMax: z.coerce.number().positive().max(100000).optional(),
  page: z.coerce.number().int().positive().max(1000).optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
});

publicRouter.get("/formations", (req, res) => {
  const parsed = searchSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Paramètres invalides", details: parsed.error.flatten() });
  res.json(searchFormations(parsed.data));
});

publicRouter.get("/formations/:numero", (req, res) => {
  const f = getFormation(req.params.numero);
  if (!f) return res.status(404).json({ error: "Formation introuvable" });
  res.json(f);
});

publicRouter.get("/organismes/:siret", (req, res) => {
  const o = getOrganisme(req.params.siret);
  if (!o) return res.status(404).json({ error: "Organisme introuvable" });
  res.json(o);
});

publicRouter.get("/categories", (_req, res) => res.json(listCategories()));
publicRouter.get("/departements", (_req, res) => res.json(listDepartements()));
