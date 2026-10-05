import { DEFAULT_RATE_SOURCE } from "../shared/catalog.js";

// API publica y gratuita de cotizaciones del dolar en Argentina
// (RATES_URL permite apuntar a otra, por ejemplo un mock en desarrollo).
export const RATES_URL = process.env.RATES_URL || "https://dolarapi.com/v1/dolares";

// "casa" de dolarapi -> nuestra clave de fuente.
const CASA_TO_SOURCE = { oficial: "oficial", blue: "blue", bolsa: "mep" };

const CACHE_TTL_MS = 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;

/*
Cotizaciones con cache en la base:
- Si hay datos guardados, responde con eso y actualiza en segundo plano
  cuando tienen mas de 30 minutos.
- Si la API no responde, se siguen usando los ultimos valores guardados.
- Si nunca se pudo consultar, el usuario puede cargar una cotizacion manual.
fetchImpl y now se pueden reemplazar en los tests.
*/
export function createRatesService(db, { fetchImpl = globalThis.fetch, now = () => new Date() } = {}) {
  const upsertRate = db.prepare(`
    INSERT INTO exchange_rates (source, buy, sell, updated_at, fetched_at)
    VALUES (@source, @buy, @sell, @updatedAt, @fetchedAt)
    ON CONFLICT (source) DO UPDATE SET
      buy = excluded.buy, sell = excluded.sell,
      updated_at = excluded.updated_at, fetched_at = excluded.fetched_at
  `);
  const selectRates = db.prepare(
    "SELECT source, buy, sell, updated_at AS updatedAt, fetched_at AS fetchedAt FROM exchange_rates",
  );
  const getSetting = db.prepare("SELECT value FROM settings WHERE key = ?");
  const setSetting = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT (key) DO UPDATE SET value = excluded.value
  `);
  const deleteSetting = db.prepare("DELETE FROM settings WHERE key = ?");

  let inFlight = null;
  let lastError = null;

  function readRates() {
    const rates = {};
    let fetchedAt = null;
    for (const row of selectRates.all()) {
      rates[row.source] = { buy: row.buy, sell: row.sell, updatedAt: row.updatedAt };
      if (!fetchedAt || row.fetchedAt > fetchedAt) fetchedAt = row.fetchedAt;
    }
    return { rates, fetchedAt };
  }

  function isFresh(fetchedAt) {
    return fetchedAt && now().getTime() - new Date(fetchedAt).getTime() < CACHE_TTL_MS;
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
      upsertRate.run({
        source,
        buy: Number.isFinite(buy) ? buy : null,
        sell,
        updatedAt: item.fechaActualizacion ?? fetchedAt,
        fetchedAt,
      });
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
    const { rates, fetchedAt } = readRates();
    if (isFresh(fetchedAt)) return;
    if (Object.keys(rates).length === 0) await refresh();
    else refresh();
  }

  function getSettings() {
    const manual = getSetting.get("manualRate")?.value;
    return {
      source: getSetting.get("rateSource")?.value ?? DEFAULT_RATE_SOURCE,
      manualRate: manual ? Number(manual) : null,
    };
  }

  function saveSettings({ source, manualRate }) {
    setSetting.run("rateSource", source);
    if (manualRate) setSetting.run("manualRate", String(manualRate));
    else deleteSetting.run("manualRate");
  }

  // Cotizacion activa (venta) segun la fuente elegida, o null si no hay datos.
  function getActiveRate() {
    const { source, manualRate } = getSettings();
    if (source === "manual") return manualRate;
    return readRates().rates[source]?.sell ?? null;
  }

  function getStatus() {
    const { rates, fetchedAt } = readRates();
    const settings = getSettings();
    return {
      ...settings,
      rate: getActiveRate(),
      rates,
      fetchedAt,
      stale: !isFresh(fetchedAt),
      error: lastError,
    };
  }

  return { ensureFresh, refresh, getSettings, saveSettings, getActiveRate, getStatus };
}
