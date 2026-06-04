// Schéma MySQL (prod — non utilisé en dev, présent pour respecter la convention ×3
// fichiers de naturo-pro et préparer le déploiement). À garder synchronisé avec schema.ts.
import { mysqlTable, varchar, int, double, text, tinyint } from "drizzle-orm/mysql-core";

export const organismes = mysqlTable("organismes", {
  siret: varchar("siret", { length: 14 }).primaryKey(),
  nom: varchar("nom", { length: 512 }).notNull(),
  departement: varchar("departement", { length: 128 }),
  codeDepartement: varchar("code_departement", { length: 8 }),
  region: varchar("region", { length: 128 }),
  ville: varchar("ville", { length: 256 }),
  qualiopi: tinyint("qualiopi"),
  logoUrl: varchar("logo_url", { length: 1024 }),
  createdAt: varchar("created_at", { length: 32 }).notNull(),
  updatedAt: varchar("updated_at", { length: 32 }).notNull(),
});

export const categories = mysqlTable("categories", {
  id: int("id").primaryKey().autoincrement(),
  formacodeLabel: varchar("formacode_label", { length: 256 }).notNull().unique(),
  nom: varchar("nom", { length: 256 }).notNull(),
  slug: varchar("slug", { length: 256 }).notNull().unique(),
});

export const formations = mysqlTable("formations", {
  numeroFormation: varchar("numero_formation", { length: 128 }).primaryKey(),
  siret: varchar("siret", { length: 14 }).notNull(),
  intitule: varchar("intitule", { length: 1024 }).notNull(),
  intituleCertification: varchar("intitule_certification", { length: 1024 }),
  typeReferentiel: varchar("type_referentiel", { length: 32 }),
  codeRncp: varchar("code_rncp", { length: 32 }),
  codeRs: varchar("code_rs", { length: 32 }),
  formacodeLabel: varchar("formacode_label", { length: 256 }),
  categorieId: int("categorie_id"),
  niveau: varchar("niveau", { length: 256 }),
  heures: int("heures"),
  prixMin: double("prix_min"),
  prixMax: double("prix_max"),
  aDistance: tinyint("a_distance").notNull().default(0),
  nbSessions: int("nb_sessions"),
  departement: varchar("departement", { length: 128 }),
  codeDepartement: varchar("code_departement", { length: 8 }),
  objectif: text("objectif"),
  contenu: text("contenu"),
  pointsForts: text("points_forts"),
  dateExtract: varchar("date_extract", { length: 32 }),
  isActive: tinyint("is_active").notNull().default(1),
  createdAt: varchar("created_at", { length: 32 }).notNull(),
  updatedAt: varchar("updated_at", { length: 32 }).notNull(),
});

export const formationDepartements = mysqlTable("formation_departements", {
  numeroFormation: varchar("numero_formation", { length: 128 }).notNull(),
  codeDepartement: varchar("code_departement", { length: 8 }).notNull(),
  departement: varchar("departement", { length: 128 }),
  region: varchar("region", { length: 128 }),
});

export const partenaires = mysqlTable("partenaires", {
  id: int("id").primaryKey().autoincrement(),
  nom: varchar("nom", { length: 256 }).notNull(),
  email: varchar("email", { length: 256 }).notNull(),
  categoriesSlugs: text("categories_slugs"),
  priorite: int("priorite").notNull().default(0),
  actif: tinyint("actif").notNull().default(1),
  createdAt: varchar("created_at", { length: 32 }).notNull(),
});

export const leads = mysqlTable("leads", {
  id: int("id").primaryKey().autoincrement(),
  numeroFormation: varchar("numero_formation", { length: 128 }),
  nom: varchar("nom", { length: 256 }).notNull(),
  email: varchar("email", { length: 256 }).notNull(),
  tel: varchar("tel", { length: 32 }),
  consentementRgpd: tinyint("consentement_rgpd").notNull().default(0),
  consentementAt: varchar("consentement_at", { length: 32 }),
  statut: varchar("statut", { length: 32 }).notNull().default("nouveau"),
  partenaireId: int("partenaire_id"),
  createdAt: varchar("created_at", { length: 32 }).notNull(),
});
