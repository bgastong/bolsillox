import { INVESTMENT_HISTORY_YEARS } from "../shared/catalog.js";
import { sql } from "./sql.js";

/*
Precios de mercado para las inversiones indexadas, guardados en la base y
compartidos por todos los usuarios (como la cotizacion del dolar):
- Indices: historial diario y precio actual desde Yahoo Finance (sin clave;
  con unos minutos de demora). Si Yahoo no responde, el historial sale de Stooq.
- Dolar MEP historico (para las inversiones en pesos), desde argentinadatos.com.
Si las APIs no responden, se sigue usando lo ultimo guardado.
*/

export const MARKET_INDICES = {
  sp500: { name: "S&P 500", yahoo: "^GSPC", stooq: "^spx" },
};

// Simbolo con el que se guarda el MEP historico en market_prices.
export const MEP_SYMBOL = "MEP";

const YAHOO_URL = process.env.MARKET_URL || "https://query1.finance.yahoo.com/v8/finance/chart";
const STOOQ_URL = "https://stooq.com/q/d/l/";
const MEP_HISTORY_URL = process.env.MEP_HISTORY_URL || "https://api.argentinadatos.com/v1/cotizaciones/dolares/bolsa";

const QUOTE_TTL_MS = 10 * 60 * 1000;
const MEP_TTL_MS = 12 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 6000;

// Fecha "YYYY-MM-DD" de un instante en la zona horaria de la bolsa.
function dateIn(timeZone, epochSeconds) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(epochSeconds * 1000),
  );
}

// Respuesta del grafico de Yahoo -> { points: [{ date, close }], quote }.
export function parseYahooChart(data) {
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error("respuesta inesperada de Yahoo");
  const timeZone = result.meta?.exchangeTimezoneName || "America/New_York";
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const points = [];
  (result.timestamp ?? []).forEach((ts, index) => {
    const close = Number(closes[index]);
    if (Number.isFinite(close) && close > 0) points.push({ date: dateIn(timeZone, ts), close });
  });
  const price = Number(result.meta?.regularMarketPrice);
  const quote = Number.isFinite(price) && price > 0
    ? {
        price,
        previousClose: Number(result.meta.chartPreviousClose ?? result.meta.previousClose) || null,
        marketTime: result.meta.regularMarketTime ? new Date(result.meta.regularMarketTime * 1000).toISOString() : null,
      }
    : null;
  // Varios puntos el mismo dia (Yahoo agrega el de hoy en vivo): queda el ultimo.
  const byDate = new Map(points.map((point) => [point.date, point]));
  return { points: [...byDate.values()], quote };
}

// CSV diario de Stooq ("Date,Open,High,Low,Close,Volume") -> [{ date, close }].
export function parseStooqCsv(text) {
  const lines = String(text).trim().split(/\r?\n/).slice(1);
  const points = [];
  for (const line of lines) {
    const [date, , , , close] = line.split(",");
    const value = Number(close);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(value) && value > 0) points.push({ date, close: value });
  }
  if (!points.length) throw new Error("respuesta inesperada de Stooq");
  return points;
}

// Historial del MEP de argentinadatos ([{ fecha, venta }]) -> [{ date, close }].
export function parseMepHistory(data) {
  if (!Array.isArray(data)) throw new Error("respuesta inesperada del MEP");
  const points = [];
  for (const item of data) {
    const close = Number(item?.venta);
    if (/^\d{4}-\d{2}-\d{2}$/.test(item?.fecha) && Number.isFinite(close) && close > 0) {
      points.push({ date: item.fecha, close });
    }
  }
  if (!points.length) throw new Error("MEP sin datos");
  return points;
}

// Ultimo precio con fecha <= date en una serie ordenada [{ date, close }] (o null).
export function priceOn(series, date) {
  let low = 0;
  let high = series.length - 1;
  let found = null;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (series[middle].date <= date) {
      found = series[middle].close;
      low = middle + 1;
    } else high = middle - 1;
  }
  return found;
}

export function createMarketService(db, { fetchImpl = globalThis.fetch, now = () => new Date() } = {}) {
  const inFlight = new Map();
  const lastError = new Map();

  async function getJson(url) {
    const response = await fetchImpl(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      // Yahoo rechaza pedidos sin navegador conocido.
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (bolsillox)" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async function getText(url) {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  }

  // Guarda muchos cierres de una (un solo pedido a la base).
  async function savePoints(symbol, points) {
    if (!points.length) return;
    await db.run(sql`
      INSERT INTO market_prices (symbol, date, close)
      SELECT ${symbol}, date, close
      FROM unnest(${points.map((point) => point.date)}::text[], ${points.map((point) => point.close)}::float8[]) AS t (date, close)
      ON CONFLICT (symbol, date) DO UPDATE SET close = excluded.close
    `);
  }

  async function saveQuote(symbol, { price, previousClose = null, marketTime = null }) {
    await db.run(sql`
      INSERT INTO market_quotes (symbol, price, previous_close, market_time, fetched_at)
      VALUES (${symbol}, ${price}, ${previousClose}, ${marketTime}, ${now().toISOString()})
      ON CONFLICT (symbol) DO UPDATE SET
        price = excluded.price, previous_close = excluded.previous_close,
        market_time = excluded.market_time, fetched_at = excluded.fetched_at
    `);
  }

  async function readQuote(symbol) {
    return db.one(sql`
      SELECT price, previous_close AS "previousClose", market_time AS "marketTime", fetched_at AS "fetchedAt"
      FROM market_quotes WHERE symbol = ${symbol}
    `);
  }

  async function history(symbol, from = null) {
    const fromFilter = from ? sql`AND date >= ${from}` : sql``;
    return db.all(sql`
      SELECT date, close FROM market_prices WHERE symbol = ${symbol} ${fromFilter} ORDER BY date
    `);
  }

  async function hasHistory(symbol) {
    const row = await db.one(sql`SELECT EXISTS (SELECT 1 FROM market_prices WHERE symbol = ${symbol}) AS found`);
    return Boolean(row.found);
  }

  // Trae el indice: la primera vez, los ultimos años; despues, el ultimo mes.
  async function fetchIndex(key) {
    const meta = MARKET_INDICES[key];
    const range = (await hasHistory(meta.yahoo)) ? "1mo" : `${INVESTMENT_HISTORY_YEARS}y`;
    try {
      const data = await getJson(`${YAHOO_URL}/${encodeURIComponent(meta.yahoo)}?range=${range}&interval=1d`);
      const { points, quote } = parseYahooChart(data);
      await savePoints(meta.yahoo, points);
      const last = points.at(-1);
      await saveQuote(meta.yahoo, quote ?? { price: last.close, previousClose: points.at(-2)?.close ?? null });
    } catch (yahooError) {
      // Respaldo: el historial diario de Stooq (el ultimo cierre hace de precio actual).
      const points = parseStooqCsv(await getText(`${STOOQ_URL}?s=${encodeURIComponent(meta.stooq)}&i=d`));
      const since = `${now().getFullYear() - INVESTMENT_HISTORY_YEARS}-01-01`;
      await savePoints(meta.yahoo, points.filter((point) => point.date >= since));
      await saveQuote(meta.yahoo, { price: points.at(-1).close, previousClose: points.at(-2)?.close ?? null });
      console.warn(`[market] Yahoo no respondio (${yahooError.message}); se uso Stooq`);
    }
  }

  async function fetchMep() {
    const points = parseMepHistory(await getJson(MEP_HISTORY_URL));
    await savePoints(MEP_SYMBOL, points);
    await saveQuote(MEP_SYMBOL, { price: points.at(-1).close });
  }

  // Un pedido por simbolo a la vez: si ya hay uno en curso, se reutiliza.
  function refresh(symbol, task) {
    if (!inFlight.has(symbol)) {
      inFlight.set(
        symbol,
        task()
          .then(() => lastError.delete(symbol))
          .catch((error) => {
            lastError.set(symbol, error.message);
            console.warn(`[market] No se pudo actualizar ${symbol}: ${error.message}`);
          })
          .finally(() => inFlight.delete(symbol)),
      );
    }
    return inFlight.get(symbol);
  }

  // Sin datos guardados espera la respuesta; con datos viejos, actualiza en segundo plano.
  async function ensure(symbol, ttl, task) {
    const quote = await readQuote(symbol);
    if (quote && now().getTime() - new Date(quote.fetchedAt).getTime() < ttl) return;
    if (!quote) await refresh(symbol, task);
    else refresh(symbol, task);
  }

  async function ensureFresh(key, { withMep = false } = {}) {
    const meta = MARKET_INDICES[key];
    await Promise.all([
      ensure(meta.yahoo, QUOTE_TTL_MS, () => fetchIndex(key)),
      withMep ? ensure(MEP_SYMBOL, MEP_TTL_MS, fetchMep) : null,
    ]);
  }

  // Como viene el indice hoy: precio, variacion del dia y si los datos estan al dia.
  async function status(key) {
    const meta = MARKET_INDICES[key];
    const quote = await readQuote(meta.yahoo);
    if (!quote) return { key, name: meta.name, available: false, error: lastError.get(meta.yahoo) ?? null };
    const change = quote.previousClose ? quote.price - quote.previousClose : null;
    return {
      key,
      name: meta.name,
      available: true,
      price: quote.price,
      previousClose: quote.previousClose,
      change,
      changePercent: change !== null ? (change / quote.previousClose) * 100 : null,
      marketTime: quote.marketTime,
      fetchedAt: quote.fetchedAt,
      stale: now().getTime() - new Date(quote.fetchedAt).getTime() > QUOTE_TTL_MS * 3,
      error: lastError.get(meta.yahoo) ?? null,
    };
  }

  return { ensureFresh, status, history, readQuote, refresh };
}
