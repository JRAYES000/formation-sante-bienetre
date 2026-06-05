// Connexion DB (dev = SQLite via better-sqlite3, SYNCHRONE comme dans naturo-pro).
import "dotenv/config";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.ts";

const sqlitePath = process.env.SQLITE_PATH ?? "./data/formations.db";
mkdirSync(dirname(sqlitePath), { recursive: true });

export const sqlite = new Database(sqlitePath);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });

// L1 : création de tables idempotente (les migrations Drizzle-kit viendront plus tard).
export function ensureSchema(): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS organismes (
      siret TEXT PRIMARY KEY,
      nom TEXT NOT NULL,
      departement TEXT,
      code_departement TEXT,
      region TEXT,
      ville TEXT,
      qualiopi INTEGER,
      logo_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      formacode_label TEXT NOT NULL UNIQUE,
      nom TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS formations (
      numero_formation TEXT PRIMARY KEY,
      siret TEXT NOT NULL REFERENCES organismes(siret),
      intitule TEXT NOT NULL,
      intitule_certification TEXT,
      type_referentiel TEXT,
      code_rncp TEXT,
      code_rs TEXT,
      formacode_label TEXT,
      categorie_id INTEGER REFERENCES categories(id),
      niveau TEXT,
      heures INTEGER,
      prix_min REAL,
      prix_max REAL,
      a_distance INTEGER NOT NULL DEFAULT 0,
      nb_sessions INTEGER,
      departement TEXT,
      code_departement TEXT,
      objectif TEXT,
      contenu TEXT,
      points_forts TEXT,
      date_extract TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS partenaires (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      email TEXT NOT NULL,
      categories_slugs TEXT,
      priorite INTEGER NOT NULL DEFAULT 0,
      actif INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_formation TEXT REFERENCES formations(numero_formation),
      nom TEXT NOT NULL,
      email TEXT NOT NULL,
      tel TEXT,
      consentement_rgpd INTEGER NOT NULL DEFAULT 0,
      consentement_at TEXT,
      statut TEXT NOT NULL DEFAULT 'nouveau',
      partenaire_id INTEGER REFERENCES partenaires(id),
      qualification TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS avis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      siret TEXT NOT NULL,
      note INTEGER NOT NULL,
      auteur TEXT,
      commentaire TEXT,
      statut TEXT NOT NULL DEFAULT 'en_attente',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS newsletter (
      email TEXT PRIMARY KEY,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS formation_departements (
      numero_formation TEXT NOT NULL REFERENCES formations(numero_formation),
      code_departement TEXT NOT NULL,
      departement TEXT,
      region TEXT,
      PRIMARY KEY (numero_formation, code_departement)
    );

    CREATE INDEX IF NOT EXISTS idx_formations_categorie ON formations(categorie_id);
    CREATE INDEX IF NOT EXISTS idx_formations_dept ON formations(code_departement);
    CREATE INDEX IF NOT EXISTS idx_formations_siret ON formations(siret);
    CREATE INDEX IF NOT EXISTS idx_formations_active ON formations(is_active);
    CREATE INDEX IF NOT EXISTS idx_fd_dept ON formation_departements(code_departement);
    CREATE INDEX IF NOT EXISTS idx_fd_num ON formation_departements(numero_formation);

    -- Recherche plein-texte (FTS5) sur les formations. Reconstruite à chaque ingestion.
    CREATE VIRTUAL TABLE IF NOT EXISTS formations_fts USING fts5(
      numero_formation UNINDEXED,
      intitule,
      certification,
      organisme,
      tokenize = 'unicode61 remove_diacritics 2'
    );

    CREATE INDEX IF NOT EXISTS idx_avis_siret ON avis(siret);
  `);

  // Migrations idempotentes pour les bases existantes (colonne ajoutée après coup).
  try {
    sqlite.exec("ALTER TABLE leads ADD COLUMN qualification TEXT");
  } catch {
    /* colonne déjà présente */
  }
}
