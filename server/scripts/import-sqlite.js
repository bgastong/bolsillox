// Uso: npm run import:sqlite -- --email tu@email.com [--file server/data/bolsillox.db]
// Con DATABASE_URL importa a ese Postgres (por ejemplo, Neon); si no, a la base local.
import "../env.js";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { openDatabase } from "../db.js";
import { sql } from "../sql.js";
import { importSqlite } from "./importSqlite.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { values } = parseArgs({
  options: {
    email: { type: "string" },
    file: { type: "string", default: path.join(__dirname, "..", "data", "bolsillox.db") },
    force: { type: "boolean", default: false },
  },
});

if (!values.email) {
  console.error("Falta --email (la cuenta tiene que existir: registrate primero en la app).");
  process.exit(1);
}
if (!fs.existsSync(values.file)) {
  console.error(`No encontre el archivo ${values.file}`);
  process.exit(1);
}

const db = await openDatabase({
  url: process.env.DATABASE_URL,
  ...(process.env.PGLITE_DIR && { dataDir: process.env.PGLITE_DIR }),
});
try {
  const email = values.email.trim().toLowerCase();
  const user = await db.one(sql`SELECT id FROM users WHERE email = ${email}`);
  if (!user) throw new Error(`No hay ninguna cuenta con el email ${email}`);

  const { count } = await db.one(
    sql`SELECT COUNT(*) AS count FROM movements WHERE user_id = ${user.id}`,
  );
  if (count > 0 && !values.force) {
    throw new Error(
      `La cuenta ya tiene ${count} movimientos. Si igual queres sumar los importados, agrega --force.`,
    );
  }

  const result = await importSqlite(db, { file: values.file, userId: user.id });
  console.log(
    `Listo: ${result.movements} movimientos, ${result.recurring} recurrentes y ` +
      `${result.budgets} presupuestos importados a ${email}.`,
  );
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
} finally {
  await db.close();
}
