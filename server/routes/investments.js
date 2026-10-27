import { Router } from "express";
import { z } from "zod";
import { INVESTMENT_INDICES } from "../../shared/catalog.js";
import { DOLLAR_HISTORY_SOURCES, GOVERNMENTS } from "../../shared/governments.js";
import { investmentEntrySchema, investmentSchema } from "../../shared/movementSchema.js";
import { HttpError } from "../errors.js";
import { thin } from "../investments.js";
import { DOLLAR_SERIES, MARKET_INDICES, priceOn } from "../market.js";
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
Cuanto se movio el dolar en cada gobierno: el valor del primer y del ultimo
dia con datos de cada mandato (los que no tienen datos no aparecen).
*/
export function governmentTerms(series, today) {
  if (!series.length) return [];
  const first = series[0].date;
  // Los mandatos con menos de 60 dias de datos no dicen nada (quedan afuera).
  const days = (from, to) => (Date.parse(to) - Date.parse(from)) / 86_400_000;
  return GOVERNMENTS.filter((term) => days(first > term.start ? first : term.start, term.end ?? today) >= 60)
    .map((term) => {
      const start = term.start < first ? first : term.start;
      const from = priceOn(series, start) ?? series[0].close;
      const to = priceOn(series, term.end ?? today);
      return {
        key: term.key,
        name: term.name,
        short: term.short,
        start: term.start,
        end: term.end,
        partial: term.start < first,
        from,
        to,
        changePercent: from && to ? Math.round(((to - from) / from) * 10000) / 100 : null,
      };
    });
}

/*
Graficos de mercado:
- /dollar: historico del dolar (oficial, blue o MEP) con los tramos por gobierno.
- /:index: historico del indice (S&P 500) con el precio de ahora al final.
Los dos traen las compras de la persona (sus aportes) con el precio de ese dia.
*/
export function marketRouter(market, investments, { now = () => new Date() } = {}) {
  const router = Router();
  const querySchema = z.object({ range: z.enum(MARKET_RANGES).optional().default("1y") });
  const dollarSchema = querySchema.extend({
    source: z.enum(DOLLAR_HISTORY_SOURCES).optional().default("blue"),
    range: z.enum(MARKET_RANGES).optional().default("max"),
  });

  // Antes de "/:index" para que "dollar" no se tome como un indice.
  router.get("/dollar", async (req, res) => {
    const { source, range } = dollarSchema.parse(req.query);
    const today = toISODate(now());
    const { symbol } = DOLLAR_SERIES[source];
    await market.ensureDollar(source);
    const [full, quote, bought] = await Promise.all([
      market.history(symbol),
      market.readQuote(symbol),
      investments.purchases(req.user.id),
    ]);
    const from = rangeStart(range, today);
    const points = thin(from ? full.filter((point) => point.date >= from) : full);
    res.json({
      source,
      range,
      available: full.length > 0,
      price: quote?.price ?? full.at(-1)?.close ?? null,
      previousClose: quote?.previousClose ?? null,
      fetchedAt: quote?.fetchedAt ?? null,
      points,
      terms: governmentTerms(full, today),
      purchases: bought
        .filter((item) => !from || item.date >= from)
        .map((item) => ({ ...item, price: priceOn(full, item.date) }))
        .filter((item) => item.price),
    });
  });

  router.get("/:index", async (req, res) => {
    const key = req.params.index;
    if (!INVESTMENT_INDICES.includes(key)) throw new HttpError(404, "not_found");
    const { range } = querySchema.parse(req.query);
    const today = toISODate(now());
    const symbol = MARKET_INDICES[key].yahoo;
    await market.ensureFresh(key);
    const from = rangeStart(range, today);
    const [status, prices, full, bought] = await Promise.all([
      market.status(key),
      market.history(symbol, from),
      market.history(symbol),
      investments.purchases(req.user.id),
    ]);
    const points = thin(prices);
    // El precio en vivo (si es de hoy y todavia no hay cierre) va como ultimo punto.
    if (status.available && points.length && points.at(-1).date < today) {
      points.push({ date: today, close: status.price, live: true });
    }
    const purchases = bought
      .filter((item) => item.index === key && (!from || item.date >= from))
      .map((item) => ({ ...item, price: priceOn(full, item.date) ?? full[0]?.close ?? null }))
      .filter((item) => item.price);
    res.json({ ...status, range, points, purchases });
  });

  return router;
}
