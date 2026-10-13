import { createAppFromEnv } from "./setup.js";

/*
Servidor de Node (desarrollo y `npm start`). Las variables de entorno estan en setup.js.
- PORT: puerto (3001 si no se define).
- NODE_ENV=production o --production: sirve el build y usa cookies seguras.
*/
const PORT = Number(process.env.PORT) || 3001;
const isProduction =
  process.argv.includes("--production") || process.env.NODE_ENV === "production";

const { app, db } = await createAppFromEnv({ isProduction });

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
