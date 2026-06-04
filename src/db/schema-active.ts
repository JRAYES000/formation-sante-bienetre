// Sélecteur de schéma selon DB_DRIVER (convention naturo-pro).
// En dev : sqlite. En prod : mysql. Importer le schéma depuis ICI partout dans le code.
import "dotenv/config";

const driver = process.env.DB_DRIVER ?? "sqlite";

export const schema =
  driver === "mysql"
    ? await import("./schema-mysql.ts")
    : await import("./schema.ts");

export const isMysql = driver === "mysql";
