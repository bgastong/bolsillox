import { Router } from "express";
import { z } from "zod";
import { INVESTMENT_INDICES } from "../../shared/catalog.js";
import { investmentEntrySchema, investmentSchema } from "../../shared/movementSchema.js";
import { HttpError } from "../errors.js";
import { thin } from "../investments.js";
import { MARKET_INDICES } from "../market.js";
import { toISODate } from "../recurring.js";

const idSchema = z.coerce.number().int().positive();

function parseId(raw) {
  const result = idSchema.safeParse(raw);
  if (!result.success) throw new HttpError(400, "invalid_id");
  return result.data;
}

export function investmentsRouter(investments) {
  const router = Router();

  router.get("/", async (req, res) => {
    res.json(await investments.list(req.user.id));
  });

  router.post("/", async (req, res) => {
    res.status(201).json(await investments.create(req.user.id, investmentSchema.parse(req.body ?? {})));
  });

  router.put("/:id", async (req, res) => {
    const item = await investments.update(req.user.id, parseId(req.params.id), investmentSchema.parse(req.body ?? {}));
    if (!item) throw new HttpError(404, "not_found");
    res.json(item);
  });

  router.delete("/:id", async (req, res) => {
    if (!(await investments.remove(req.user.id, parseId(req.params.id)))) throw new HttpError(404, "not_found");
    res.status(204).end();
  });

  // Aportar o rescatar (opcionalmente cargado en los movimientos).
  router.post("/:id/entries", async (req, res) => {
    const item = await investments.addEntry(req.user.id, parseId(req.params.id), investmentEntrySchema.parse(req.body ?? {}));
    if (!item) throw new HttpError(404, "not_found");
    res.json(item);
  });

  router.delete("/:id/entries/:entryId", async (req, res) => {
    const item = await investments.removeEntry(req.user.id, parseId(req.params.id), parseId(req.params.entryId));
    if (!item) throw new HttpError(404, "not_found");
    res.json(item);
  });

  return router;
}

export const MARKET_RANGES = ["1m", "6m", "1y", "5y", "max"];
const RANGE_MONTHS = { "1m": 1, "6m": 6, "1y": 12, "5y": 60 };

// Primer dia de un rango que termina hoy ("YYYY-MM-DD"), o null para todo.
function rangeStart(range, today) {
  const months = RANGE_MONTHS[range];
  if (!months) return null;
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date.toISOString().slice(0, 10);
}

/*
Historico de un indice para el grafico: cierres diarios del rango (por semana
o mes si son muchos) y el precio de ahora como ultimo punto.
*/
export function marketRouter(market, { now = () => new Date() } = {}) {
  const router = Router();
  const querySchema = z.object({ range: z.enum(MARKET_RANGES).optional().default("1y") });

  router.get("/:index", async (req, res) => {
    const key = req.params.index;
    if (!INVESTMENT_INDICES.includes(key)) throw new HttpError(404, "not_found");
    const { range } = querySchema.parse(req.query);
    const today = toISODate(now());
    await market.ensureFresh(key);
    const [status, prices] = await Promise.all([
      market.status(key),
      market.history(MARKET_INDICES[key].yahoo, rangeStart(range, today)),
    ]);
    const points = thin(prices);
    // El precio en vivo (si es de hoy y todavia no hay cierre) va como ultimo punto.
    if (status.available && points.length && points.at(-1).date < today) {
      points.push({ date: today, close: status.price, live: true });
    }
    res.json({ ...status, range, points });
  });

  return router;
}
