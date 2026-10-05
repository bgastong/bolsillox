import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import compression from "compression";
import express from "express";
import { rateSettingsSchema } from "../shared/movementSchema.js";
import { createRepository } from "./repository.js";
import { createRecurringService } from "./recurring.js";
import { createBudgetsService } from "./budgets.js";
import { createRatesService } from "./rates.js";
import { movementsRouter } from "./routes/movements.js";
import { recurringRouter } from "./routes/recurring.js";
import { budgetsRouter } from "./routes/budgets.js";
import { buildSummary } from "./summary.js";
import { parseCurrency, parseMonth } from "./params.js";
import { errorHandler, HttpError } from "./errors.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, "..", "dist");

/*
options:
- serveStatic: sirve el build de Vite (produccion).
- now: reloj (los tests lo fijan para que las fechas sean predecibles).
- fetchImpl: fetch para las cotizaciones (los tests lo simulan).
*/
export function createApp(db, { serveStatic = false, now, fetchImpl } = {}) {
  const app = express();
  const repo = createRepository(db);
  const recurring = createRecurringService(db, { now });
  const budgets = createBudgetsService(db);
  const rates = createRatesService(db, { now, fetchImpl });

  app.disable("x-powered-by");
  // Respuestas comprimidas (gzip/brotli): la API y el build pesan bastante menos.
  app.use(compression());
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Antes de leer datos, se generan los movimientos recurrentes que vencieron.
  app.use("/api", (req, res, next) => {
    if (req.method === "GET") recurring.generateDue();
    next();
  });

  app.use("/api/movements", movementsRouter(repo));
  app.use("/api/recurring", recurringRouter(recurring));
  app.use("/api/budgets", budgetsRouter(budgets, rates));

  app.get("/api/summary", (req, res) => {
    const month = parseMonth(req.query.month);
    const target = parseCurrency(req.query.currency);
    res.json(buildSummary(repo, month, { target, rate: rates.getActiveRate() }));
  });

  app.get("/api/rates", async (req, res) => {
    await rates.ensureFresh();
    res.json(rates.getStatus());
  });

  app.put("/api/rates/settings", (req, res) => {
    rates.saveSettings(rateSettingsSchema.parse(req.body ?? {}));
    res.json(rates.getStatus());
  });

  app.use("/api", () => {
    throw new HttpError(404, "not_found");
  });

  // En produccion el mismo servidor sirve el build de Vite.
  if (serveStatic && fs.existsSync(DIST_DIR)) {
    // Los archivos de /assets llevan un hash en el nombre: se pueden cachear
    // "para siempre". index.html no, para que siempre tome la ultima version.
    app.use(
      "/assets",
      express.static(path.join(DIST_DIR, "assets"), { immutable: true, maxAge: "1y" }),
    );
    app.use(express.static(DIST_DIR, { index: false }));
    app.get(/^(?!\/api).*/, (req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(DIST_DIR, "index.html"));
    });
  }

  app.use(errorHandler);

  // index.js lo usa para traer la cotizacion apenas arranca el servidor.
  app.locals.rates = rates;

  return app;
}
