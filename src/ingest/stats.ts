// Stats rapides de la base. Lancer : npm run db:stats
import { sql } from "drizzle-orm";
import { db } from "../db/index.ts";
import { formations, organismes, categories } from "../db/schema.ts";

const cF = db.select({ n: sql<number>`count(*)` }).from(formations).get();
const cO = db.select({ n: sql<number>`count(*)` }).from(organismes).get();
const cC = db.select({ n: sql<number>`count(*)` }).from(categories).get();

console.log(`\n📊 Base formation-sante-bienetre`);
console.log(`   Formations : ${cF?.n}`);
console.log(`   Organismes : ${cO?.n}`);
console.log(`   Catégories : ${cC?.n}\n`);

console.log("Top catégories (par nb de formations) :");
const top = db
  .select({
    nom: categories.nom,
    slug: categories.slug,
    n: sql<number>`count(${formations.numeroFormation})`,
  })
  .from(categories)
  .leftJoin(formations, sql`${formations.categorieId} = ${categories.id}`)
  .groupBy(categories.id)
  .orderBy(sql`count(${formations.numeroFormation}) desc`)
  .limit(15)
  .all();
for (const t of top) console.log(`   ${String(t.n).padStart(4)}  ${t.nom}  (/${t.slug})`);

console.log("\nTop départements :");
const dept = db
  .select({ d: formations.departement, n: sql<number>`count(*)` })
  .from(formations)
  .where(sql`${formations.departement} is not null`)
  .groupBy(formations.departement)
  .orderBy(sql`count(*) desc`)
  .limit(10)
  .all();
for (const d of dept) console.log(`   ${String(d.n).padStart(4)}  ${d.d}`);
