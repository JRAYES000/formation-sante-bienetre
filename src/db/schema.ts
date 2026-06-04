// Schéma SQLite (dev). Convention héritée de naturo-pro : 3 fichiers de schéma
// (schema.ts = sqlite, schema-mysql.ts = prod, schema-active.ts = sélecteur).
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// Organismes de formation (clé propre = SIRET)
export const organismes = sqliteTable("organismes", {
  siret: text("siret").primaryKey(),
  nom: text("nom").notNull(),
  departement: text("departement"),
  codeDepartement: text("code_departement"),
  region: text("region"),
  ville: text("ville"), // v2 : enrichissement SIRENE
  qualiopi: integer("qualiopi"), // v2 : API QuiForme (0/1/null)
  logoUrl: text("logo_url"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Catégories lisibles dérivées du Formacode principal
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  formacodeLabel: text("formacode_label").notNull().unique(),
  nom: text("nom").notNull(),
  slug: text("slug").notNull().unique(),
});

// Formations (clé propre = numero_formation)
export const formations = sqliteTable("formations", {
  numeroFormation: text("numero_formation").primaryKey(),
  siret: text("siret").notNull().references(() => organismes.siret),
  intitule: text("intitule").notNull(),
  intituleCertification: text("intitule_certification"),
  typeReferentiel: text("type_referentiel"), // RNCP / RS
  codeRncp: text("code_rncp"),
  codeRs: text("code_rs"),
  formacodeLabel: text("formacode_label"),
  categorieId: integer("categorie_id").references(() => categories.id),
  niveau: text("niveau"),
  heures: integer("heures"),
  prixMin: real("prix_min"),
  prixMax: real("prix_max"),
  aDistance: integer("a_distance").notNull().default(0),
  nbSessions: integer("nb_sessions"),
  departement: text("departement"),
  codeDepartement: text("code_departement"),
  objectif: text("objectif"),
  contenu: text("contenu"),
  pointsForts: text("points_forts"),
  dateExtract: text("date_extract"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Disponibilité géographique d'une formation (grain réel du dataset : formation × département).
// Une formation peut être proposée dans plusieurs départements → 1 ligne par couple.
export const formationDepartements = sqliteTable("formation_departements", {
  numeroFormation: text("numero_formation").notNull().references(() => formations.numeroFormation),
  codeDepartement: text("code_departement").notNull(),
  departement: text("departement"),
  region: text("region"),
});

// Partenaires Voie B (organismes qui reçoivent les leads captifs — École Naturo au départ)
export const partenaires = sqliteTable("partenaires", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nom: text("nom").notNull(),
  email: text("email").notNull(),
  categoriesSlugs: text("categories_slugs"), // CSV des slugs ciblés (null = tout)
  priorite: integer("priorite").notNull().default(0),
  actif: integer("actif").notNull().default(1),
  createdAt: text("created_at").notNull(),
});

// Leads captés via le formulaire « Je m'informe »
export const leads = sqliteTable("leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  numeroFormation: text("numero_formation").references(() => formations.numeroFormation),
  nom: text("nom").notNull(),
  email: text("email").notNull(),
  tel: text("tel"),
  consentementRgpd: integer("consentement_rgpd").notNull().default(0),
  consentementAt: text("consentement_at"),
  statut: text("statut").notNull().default("nouveau"),
  partenaireId: integer("partenaire_id").references(() => partenaires.id),
  createdAt: text("created_at").notNull(),
});
