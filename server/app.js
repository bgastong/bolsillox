import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { z } from "zod";
import { createRepository } from "./repository.js";
import { movementsRouter } from "./routes/movements.js";
import { buildSummary, currentMonthKey } from "./summary.js";
import { errorHandler, HttpError } from "./errors.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, "..", "dist");

const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, { error: "errorMonthInvalid" });

export function createApp(db, { serveStatic = false } = {}) {
  const app = express();
  const repo = createRepository(db);

  app.disable("x-powered-by");
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/movements", movementsRouter(repo));

  app.get("/api/summary", (req, res) => {
    const month = req.query.month ? monthSchema.parse(req.query.month) : currentMonthKey();
    res.json(buildSummary(repo, month));
  });

  app.use("/api", () => {
    throw new HttpError(404, "not_found");
  });

  // En produccion el mismo servidor sirve el build de Vite.
  if (serveStatic && fs.existsSync(DIST_DIR)) {
    app.use(express.static(DIST_DIR));
    app.get(/^(?!\/api).*/, (req, res) => {
      res.sendFile(path.join(DIST_DIR, "index.html"));
    });
  }

  app.use(errorHandler);

  return app;
}
