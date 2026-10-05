import { DEFAULT_RATE_SOURCE } from "../shared/catalog.js";
import { sql } from "./sql.js";

// API publica y gratuita de cotizaciones del dolar en Argentina
// (RATES_URL permite apuntar a otra, por ejemplo un mock en desarrollo).
export const RATES_URL = process.env.RATES_URL || "https://dolarapi.com/v1/dolares";

// "casa" de dolarapi -> nuestra clave de fuente.
const CASA_TO_SOURCE = { oficial: "oficial", blue: "blue", bolsa: "mep" };

const CACHE_TTL_MS = 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;

/*
Cotizaciones con cache en la base (compartidas por todos los usuarios):
- Si hay datos guardados, responde con eso y actualiza en segundo plano
  cuando tienen mas de 30 minutos.
- Si la API no responde, se siguen usando los ultimos valores guardados.
- Si nunca se pudo consultar, cada usuario puede cargar una cotizacion manual.
La fuente elegida y la cotizacion manual son de cada usuario (user_settings).
fetchImpl y now se pueden reemplazar en los tests.
*/
export function createRatesService(db, { fetchImpl = globalThis.fetch, now = () => new Date() } = {}) {
  let inFlight = null;
  let lastError = null;

  async function readRates() {
    const rows = await db.all(sql`
      SELECT source, buy, sell, updated_at AS "updatedAt", fetched_at AS "fetchedAt"
      FROM exchange_rates
    `);
    const rates = {};
    let fetchedAt = null;
    for (const row of rows) {
      rates[row.source] = { buy: row.buy, sell: row.sell, updatedAt: row.updatedAt };
      if (!fetchedAt || row.fetchedAt > fetchedAt) fetchedAt = row.fetchedAt;
    }
    return { rates, fetchedAt };
  }

  function isFresh(fetchedAt) {
    return Boolean(fetchedAt) && now().getTime() - new Date(fetchedAt).getTime() < CACHE_TTL_MS;
  }

  async function fetchFromApi() {
    const response = await fetchImpl(RATES_URL, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("respuesta inesperada");

    const fetchedAt = now().toISOString();
    let saved = 0;
    for (const item of data) {
      const source = CASA_TO_SOURCE[item?.casa];
      const sell = Number(item?.venta);
      if (!source || !Number.isFinite(sell) || sell <= 0) continue;
      const buy = Number(item?.compra);
      await db.run(sql`
        INSERT INTO exchange_rates (source, buy, sell, updated_at, fetched_at)
        VALUES (${source}, ${Number.isFinite(buy) ? buy : null}, ${sell},
                ${item.fechaActualizacion ?? fetchedAt}, ${fetchedAt})
        ON CONFLICT (source) DO UPDATE SET
          buy = excluded.buy, sell = excluded.sell,
          updated_at = excluded.updated_at, fetched_at = excluded.fetched_at
      `);
      saved++;
    }
    if (!saved) throw new Error("sin cotizaciones validas");
    lastError = null;
  }

  // Evita pedidos simultaneos: si ya hay uno en curso, se reutiliza.
  function refresh() {
    if (!inFlight) {
      inFlight = fetchFromApi()
        .catch((error) => {
          lastError = error.message;
          console.warn(`[rates] No se pudo actualizar la cotizacion: ${error.message}`);
        })
        .finally(() => {
          inFlight = null;
        });
    }
    return inFlight;
  }

  // Actualiza si hace falta. Sin datos guardados espera la respuesta;
  // con datos viejos, actualiza en segundo plano.
  async function ensureFresh() {
    const { rates, fetchedAt } = await readRates();
    if (isFresh(fetchedAt)) return;
    if (Object.keys(rates).length === 0) await refresh();
    else refresh();
  }

  async function getSettings(userId) {
    const rows = await db.all(sql`
      SELECT key, value FROM user_settings
      WHERE user_id = ${userId} AND key IN ('rateSource', 'manualRate')
    `);
    const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return {
      source: values.rateSource ?? DEFAULT_RATE_SOURCE,
      manualRate: values.manualRate ? Number(values.manualRate) : null,
    };
  }

  async function saveSettings(userId, { source, manualRate }) {
    await db.transaction(async (tx) => {
      await setSetting(tx, userId, "rateSource", source);
      if (manualRate) await setSetting(tx, userId, "manualRate", String(manualRate));
      else {
        await tx.run(
          sql`DELETE FROM user_settings WHERE user_id = ${userId} AND key = 'manualRate'`,
        );
      }
    });
  }

  function activeRate({ source, manualRate }, rates) {
    if (source === "manual") return manualRate;
    return rates[source]?.sell ?? null;
  }

  // Cotizacion activa (venta) segun la fuente que eligio el usuario, o null.
  async function getActiveRate(userId) {
    const [settings, { rates }] = await Promise.all([getSettings(userId), readRates()]);
    return activeRate(settings, rates);
  }

  async function getStatus(userId) {
    const [settings, { rates, fetchedAt }] = await Promise.all([getSettings(userId), readRates()]);
    return {
      ...settings,
      rate: activeRate(settings, rates),
      rates,
      fetchedAt,
      stale: !isFresh(fetchedAt),
      error: lastError,
    };
  }

  return { ensureFresh, refresh, getSettings, saveSettings, getActiveRate, getStatus };
}

function setSetting(db, userId, key, value) {
  return db.run(sql`
    INSERT INTO user_settings (user_id, key, value) VALUES (${userId}, ${key}, ${value})
    ON CONFLICT (user_id, key) DO UPDATE SET value = excluded.value
  `);
}
