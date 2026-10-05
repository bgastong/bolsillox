import "./env.js";
import { createApp } from "./app.js";
import { createAuthService } from "./auth.js";
import { openDatabase, seedUser } from "./db.js";
import { googleConfigFromEnv } from "./google.js";
import { sql } from "./sql.js";

/*
Variables de entorno (ver DEPLOY.md):
- PORT: puerto (Render lo define solo).
- DATABASE_URL: Postgres de produccion. Sin ella se usa PGlite en server/data/pglite.
- PGLITE_DIR: otra carpeta para PGlite.
- GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET: activan "Continuar con Google".
- PUBLIC_URL: URL publica (por ejemplo https://bolsillox.onrender.com).
- NODE_ENV=production o --production: sirve el build y usa cookies seguras.
*/
const PORT = Number(process.env.PORT) || 3001;
const isProduction =
  process.argv.includes("--production") || process.env.NODE_ENV === "production";

const db = await openDatabase({
  url: process.env.DATABASE_URL,
  ...(process.env.PGLITE_DIR && { dataDir: process.env.PGLITE_DIR }),
});

// En desarrollo, una cuenta de prueba con datos de ejemplo para no arrancar vacio.
const DEMO = { name: "Demo", email: "demo@bolsillox.app", password: "demo1234" };
if (!isProduction) {
  const { count } = await db.one(sql`SELECT COUNT(*) AS count FROM users`);
  if (count === 0) {
    const user = await createAuthService(db).register(DEMO);
    await seedUser(db, user.id);
    console.log(`Cuenta de prueba creada: ${DEMO.email} / ${DEMO.password}`);
  }
}

const app = createApp(db, {
  serveStatic: isProduction,
  secureCookies: isProduction && process.env.COOKIE_SECURE !== "false",
  trustProxy: isProduction,
  google: googleConfigFromEnv(),
  publicUrl: process.env.PUBLIC_URL?.replace(/\/$/, "") || null,
});

const server = app.listen(PORT, () => {
  console.log(`API de bolsillox escuchando en http://localhost:${PORT}/api`);
  // Trae la cotizacion del dolar al arrancar (sin bloquear el servidor).
  app.locals.rates.ensureFresh();
});

function shutdown() {
  server.close(async () => {
    await db.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
