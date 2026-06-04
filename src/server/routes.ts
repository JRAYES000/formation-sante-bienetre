// Routes publiques (sans auth). Préfixe /api/public. Aucune SQL ici : tout via storage.
import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import {
  searchFormations,
  getFormation,
  getOrganisme,
  listCategories,
  listDepartements,
  createLead,
  listLeads,
  updateLeadStatut,
  listPartenaires,
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

// Lead capture (Voie B). Le consentement RGPD doit être explicitement true.
const leadSchema = z.object({
  numeroFormation: z.string().trim().max(128).optional(),
  nom: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  tel: z.string().trim().max(30).optional(),
  consentement: z.literal(true, {
    errorMap: () => ({ message: "Le consentement RGPD est requis." }),
  }),
});

publicRouter.post("/leads", (req, res) => {
  const parsed = leadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Formulaire invalide", details: parsed.error.flatten() });
  const { consentement, ...lead } = parsed.data;
  const created = createLead(lead);
  res.status(201).json({ ok: true, id: created.id });
});

// ─────────────── Back-office (token simple via ADMIN_TOKEN) ───────────────
export const adminRouter = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: "Non autorisé" });
  }
  next();
}
adminRouter.use(requireAdmin);

adminRouter.get("/leads", (_req, res) => res.json(listLeads()));
adminRouter.get("/partenaires", (_req, res) => res.json(listPartenaires()));

const statutSchema = z.object({ statut: z.enum(["nouveau", "contacte", "converti", "perdu"]) });
adminRouter.patch("/leads/:id", (req, res) => {
  const parsed = statutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Statut invalide" });
  const changed = updateLeadStatut(Number(req.params.id), parsed.data.statut);
  if (!changed) return res.status(404).json({ error: "Lead introuvable" });
  res.json({ ok: true });
});
