// Routes publiques (sans auth). Préfixe /api/public. Aucune SQL ici : tout via storage.
import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import {
  searchFormations,
  getFormation,
  getOrganisme,
  similarFormations,
  globalStats,
  listCategories,
  listDepartements,
  createLead,
  listLeads,
  updateLeadStatut,
  listPartenaires,
  getPartenaireById,
  getFormationIntitule,
  createAvis,
  avisForOrganisme,
  listAvisAdmin,
  moderateAvis,
  subscribeNewsletter,
  listNewsletter,
  seoVilles,
} from "./storage.ts";
import { listMetiers, listArticles } from "./content.ts";
import { sendLeadNotification, sendWelcomeEmail } from "./mailer.ts";
import { allIndexableUrls } from "./seo.ts";
import { submitIndexNow } from "./indexnow.ts";

export const publicRouter = Router();

const searchSchema = z.object({
  q: z.string().trim().max(120).optional(),
  categorie: z.string().trim().max(120).optional(),
  dept: z.string().trim().max(8).optional(),
  distance: z.coerce.boolean().optional(),
  prixMin: z.coerce.number().nonnegative().max(100000).optional(),
  prixMax: z.coerce.number().positive().max(100000).optional(),
  niveau: z.string().trim().max(120).optional(),
  type: z.string().trim().max(20).optional(),
  sort: z.enum(["pertinence", "prix_asc", "prix_desc"]).optional(),
  page: z.coerce.number().int().positive().max(1000).optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
});

publicRouter.get("/formations", (req, res) => {
  const parsed = searchSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Paramètres invalides", details: parsed.error.flatten() });
  res.json(searchFormations(parsed.data));
});

publicRouter.get("/formations/:numero/similaires", (req, res) => {
  res.json(similarFormations(req.params.numero));
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
publicRouter.get("/stats", (_req, res) => res.json(globalStats()));
publicRouter.get("/metiers", (_req, res) => res.json(listMetiers()));
publicRouter.get("/articles", (_req, res) => res.json(listArticles()));
publicRouter.get("/villes", (_req, res) => res.json(seoVilles(3)));

const newsletterSchema = z.object({ email: z.string().trim().email().max(160) });
publicRouter.post("/newsletter", (req, res) => {
  const parsed = newsletterSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Email invalide" });
  const isNew = subscribeNewsletter(parsed.data.email);
  if (isNew) void sendWelcomeEmail(parsed.data.email.toLowerCase().trim()); // bienvenue, non bloquant
  res.status(201).json({ ok: true });
});

// Avis organismes (modérés avant publication)
publicRouter.get("/organismes/:siret/avis", (req, res) => res.json(avisForOrganisme(req.params.siret)));
const avisSchema = z.object({
  siret: z.string().trim().min(9).max(20),
  note: z.coerce.number().int().min(1).max(5),
  auteur: z.string().trim().max(80).optional(),
  commentaire: z.string().trim().max(1000).optional(),
});
publicRouter.post("/avis", (req, res) => {
  const parsed = avisSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Avis invalide" });
  const id = createAvis(parsed.data);
  res.status(201).json({ ok: true, id });
});

// Lead capture (Voie B). Le consentement RGPD doit être explicitement true.
const leadSchema = z.object({
  numeroFormation: z.string().trim().max(128).optional(),
  nom: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  tel: z.string().trim().max(30).optional(),
  // Champs de qualification (améliorent la valeur du lead en Voie B)
  budget: z.string().trim().max(60).optional(),
  delai: z.string().trim().max(60).optional(),
  financement: z.string().trim().max(60).optional(),
  niveau: z.string().trim().max(60).optional(),
  consentement: z.literal(true, {
    errorMap: () => ({ message: "Le consentement RGPD est requis." }),
  }),
});

publicRouter.post("/leads", (req, res) => {
  const parsed = leadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Formulaire invalide", details: parsed.error.flatten() });
  const { consentement, budget, delai, financement, niveau, ...lead } = parsed.data;
  const qualification: Record<string, string> = {};
  if (budget) qualification.budget = budget;
  if (delai) qualification.delai = delai;
  if (financement) qualification.financement = financement;
  if (niveau) qualification.niveau = niveau;
  const created = createLead({ ...lead, qualification: Object.keys(qualification).length ? qualification : undefined });

  // Notification Voie B au partenaire (non bloquant)
  if (created.partenaireId) {
    const p = getPartenaireById(created.partenaireId);
    if (p) {
      void sendLeadNotification({
        partenaireEmail: p.email,
        partenaireNom: p.nom,
        nom: lead.nom,
        email: lead.email,
        tel: lead.tel,
        formationTitre: lead.numeroFormation ? getFormationIntitule(lead.numeroFormation) : null,
        qualification: Object.keys(qualification).length ? qualification : undefined,
      });
    }
  }

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
adminRouter.get("/newsletter", (_req, res) => res.json(listNewsletter()));

const statutSchema = z.object({ statut: z.enum(["nouveau", "contacte", "converti", "perdu"]) });
adminRouter.patch("/leads/:id", (req, res) => {
  const parsed = statutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Statut invalide" });
  const changed = updateLeadStatut(Number(req.params.id), parsed.data.statut);
  if (!changed) return res.status(404).json({ error: "Lead introuvable" });
  res.json({ ok: true });
});

// Soumet toutes les URLs indexables à IndexNow (Bing/Yandex).
adminRouter.post("/indexnow", async (req, res) => {
  const base = process.env.PUBLIC_URL || `https://${req.get("host")}`;
  const r = await submitIndexNow(allIndexableUrls(base));
  res.json({ submitted: r.count, status: r.status, ok: r.ok });
});

adminRouter.get("/avis", (_req, res) => res.json(listAvisAdmin()));
const avisModSchema = z.object({ statut: z.enum(["publie", "rejete"]) });
adminRouter.patch("/avis/:id", (req, res) => {
  const parsed = avisModSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Statut invalide" });
  const changed = moderateAvis(Number(req.params.id), parsed.data.statut);
  if (!changed) return res.status(404).json({ error: "Avis introuvable" });
  res.json({ ok: true });
});
