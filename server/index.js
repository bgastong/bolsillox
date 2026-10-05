import { createApp } from "./app.js";
import { DEFAULT_DB_PATH, openDatabase } from "./db.js";

const PORT = Number(process.env.PORT) || 3001;
const DB_PATH = process.env.DB_PATH || DEFAULT_DB_PATH;

const isProduction =
  process.argv.includes("--production") || process.env.NODE_ENV === "production";

const db = openDatabase({ filename: DB_PATH });
const app = createApp(db, { serveStatic: isProduction });

const server = app.listen(PORT, () => {
  console.log(`API de bolsillox escuchando en http://localhost:${PORT}/api`);
  // Trae la cotizacion del dolar al arrancar (sin bloquear el servidor).
  app.locals.rates.ensureFresh();
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
