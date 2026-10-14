import "./env.js";
import { createApp } from "./app.js";
import { createAuthService } from "./auth.js";
import { openDatabase, seedUser } from "./db.js";
import { googleConfigFromEnv } from "./google.js";
import { mailerFromEnv } from "./mailer.js";
import { sql } from "./sql.js";

/*
Arma la app a partir de las variables de entorno (ver DEPLOY.md):
- DATABASE_URL: Postgres de produccion. Sin ella se usa PGlite en server/data/pglite.
- PGLITE_DIR: otra carpeta para PGlite.
- PG_POOL_MAX: conexiones por instancia (en Vercel conviene 1 o 2).
- GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET: activan "Continuar con Google".
- PUBLIC_URL: URL publica (por ejemplo https://bolsillox.com.ar).
- RESEND_API_KEY / EMAIL_FROM: envio de codigos por email (verificacion y
  recuperar contraseña). En desarrollo, sin clave, el codigo sale por consola.
- ALERT_EMAIL: email donde avisar los errores inesperados (usa el mismo Resend).
- COOKIE_SECURE=false: cookies sin HTTPS (solo para probar el build en local).

La usan server/index.js (desarrollo y `npm start`) y api/index.js (Vercel).
- isProduction: cookies seguras y detras de un proxy; sin cuenta de prueba.
- serveStatic: el mismo servidor sirve el build (en Vercel lo sirve su CDN).
- requireDatabase: falla si no hay DATABASE_URL (en Vercel no hay disco para PGlite).
*/
export async function createAppFromEnv({ isProduction, serveStatic = isProduction, requireDatabase = false }) {
  if (requireDatabase && !process.env.DATABASE_URL) {
    throw new Error("Falta la variable DATABASE_URL (la URL de Postgres en Neon).");
  }

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
    serveStatic,
    secureCookies: isProduction && process.env.COOKIE_SECURE !== "false",
    trustProxy: isProduction,
    google: googleConfigFromEnv(),
    publicUrl: process.env.PUBLIC_URL?.replace(/\/$/, "") || null,
    mailer: mailerFromEnv({ isProduction }),
    alertEmail: process.env.ALERT_EMAIL?.trim() || null,
    cronSecret: process.env.CRON_SECRET?.trim() || null,
  });

  return { app, db };
}
