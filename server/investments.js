import { INVESTMENT_HISTORY_YEARS, INVESTMENTS_MAX } from "../shared/catalog.js";
import { HttpError } from "./errors.js";
import { MARKET_INDICES, MEP_SYMBOL, priceOn } from "./market.js";
import { roundMoney } from "./money.js";
import { toISODate } from "./recurring.js";
import { sql } from "./sql.js";

/*
Inversiones indexadas: la persona carga aportes (por ejemplo, $ 100.000 por
mes) y cada uno "compra" indice al precio de ese dia. Lo que vale hoy es la
suma de lo comprado por el precio de hoy, asi sube y baja con el indice.
En pesos, el aporte se pasa a dolares con el MEP de ese dia y se vuelve a
pesos con el MEP de hoy (como un CEDEAR): refleja tambien la suba del dolar.
*/

const COLUMNS = sql`
  id, name, index_key AS "index", currency, created_at AS "createdAt", updated_at AS "updatedAt"
`;

// Mas puntos que estos y el grafico pasa a uno por semana (o por mes).
const MAX_POINTS = 300;
const RECENT_ENTRIES = 30;

/*
Unidades de indice que compro cada aporte (negativas si es un rescate).
market: { prices: [{ date, close }], mep: [{ date, close }], mepNow }.
Devuelve null si falta el precio de algun aporte (todavia no hay historial).
*/
function unitsOf(entry, currency, market) {
  const price = priceOn(market.prices, entry.date) ?? market.prices[0]?.close ?? null;
  const fx = currency === "ARS" ? (priceOn(market.mep, entry.date) ?? market.mep[0]?.close ?? market.mepNow) : 1;
  if (!price || !fx) return null;
  return entry.amount / fx / price;
}

/*
Cuanto se aporto (neto de rescates), cuanto vale hoy y cuanto se gano.
market.priceNow: precio actual del indice. pending: faltan precios para calcular.
*/
export function investmentValue({ currency, entries }, market) {
  const invested = roundMoney(entries.reduce((sum, entry) => sum + entry.amount, 0));
  let units = 0;
  for (const entry of entries) {
    const bought = unitsOf(entry, currency, market);
    if (bought === null) return { invested, units: null, value: null, gain: null, gainPercent: null, pending: true };
    units += bought;
  }
  const fxNow = currency === "ARS" ? market.mepNow : 1;
  if (!market.priceNow || !fxNow) return { invested, units, value: null, gain: null, gainPercent: null, pending: true };
  const value = roundMoney(Math.max(units, 0) * market.priceNow * fxNow);
  const gain = roundMoney(value - invested);
  return {
    invested,
    units,
    value,
    gain,
    gainPercent: invested > 0 ? Math.round((gain / invested) * 10000) / 100 : null,
    pending: false,
  };
}

// Se queda con el ultimo punto de cada semana (o mes) para no pasar de MAX_POINTS.
export function thin(points) {
  if (points.length <= MAX_POINTS) return points;
  for (const keyOf of [weekKey, (date) => date.slice(0, 7)]) {
    const byKey = new Map();
    for (const point of points) byKey.set(keyOf(point.date), point);
    const result = [...byKey.values()];
    if (result.length <= MAX_POINTS || keyOf !== weekKey) return result;
  }
  return points;
}

// Lunes de la semana de una fecha "YYYY-MM-DD".
function weekKey(iso) {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

/*
Como fue cambiando la inversion: un punto por dia de mercado desde el primer
aporte (lo aportado hasta ese dia y lo que valia). El ultimo es hoy, con el
precio actual. [{ date, invested, value }]
*/
export function investmentSeries({ currency, entries }, market, today) {
  if (!entries.length || !market.prices.length) return [];
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const days = market.prices.filter((point) => point.date >= sorted[0].date && point.date <= today);
  if (!days.length || days.at(-1).date < today) days.push({ date: today, close: market.priceNow ?? market.prices.at(-1).close, live: true });

  const points = [];
  let next = 0;
  let units = 0;
  let invested = 0;
  for (const day of days) {
    while (next < sorted.length && sorted[next].date <= day.date) {
      const bought = unitsOf(sorted[next], currency, market);
      if (bought === null) return [];
      units += bought;
      invested += sorted[next].amount;
      next++;
    }
    const fx = currency === "ARS" ? (day.live ? market.mepNow : (priceOn(market.mep, day.date) ?? market.mepNow)) : 1;
    points.push({
      date: day.date,
      invested: roundMoney(invested),
      value: roundMoney(Math.max(units, 0) * day.close * (fx ?? 0)),
    });
  }
  return thin(points);
}

export function createInvestmentsService(db, { market, now = () => new Date() } = {}) {
  const today = () => toISODate(now());

  // MEP de hoy: la cotizacion del dia (dolarapi) o, si no hay, el ultimo historico.
  async function currentMep() {
    const row = await db.one(sql`SELECT sell FROM exchange_rates WHERE source = 'mep'`);
    if (row?.sell) return row.sell;
    return (await market.readQuote(MEP_SYMBOL))?.price ?? null;
  }

  // Precios que hacen falta para calcular las inversiones de un indice.
  async function marketData(indexKey, needsMep) {
    const symbol = MARKET_INDICES[indexKey].yahoo;
    const [prices, quote, mep, mepNow] = await Promise.all([
      market.history(symbol),
      market.readQuote(symbol),
      needsMep ? market.history(MEP_SYMBOL) : [],
      needsMep ? currentMep() : null,
    ]);
    return { prices, mep, mepNow, priceNow: quote?.price ?? prices.at(-1)?.close ?? null };
  }

  async function entriesOf(ids) {
    if (!ids.length) return new Map();
    const rows = await db.all(sql`
      SELECT id, investment_id AS "investmentId", amount, date, movement_id AS "movementId"
      FROM investment_entries WHERE investment_id = ANY(${ids}::int[])
      ORDER BY date DESC, id DESC
    `);
    const byId = new Map(ids.map((id) => [id, []]));
    for (const { investmentId, ...entry } of rows) byId.get(investmentId).push(entry);
    return byId;
  }

  async function withValues(items, { series = false } = {}) {
    const entries = await entriesOf(items.map((item) => item.id));
    const cache = new Map();
    const dataFor = async (item) => {
      const key = `${item.index}-${item.currency}`;
      if (!cache.has(key)) cache.set(key, await marketData(item.index, item.currency === "ARS"));
      return cache.get(key);
    };
    const result = [];
    for (const item of items) {
      const list = entries.get(item.id);
      const data = await dataFor(item);
      const computed = { ...item, ...investmentValue({ currency: item.currency, entries: list }, data) };
      delete computed.units;
      computed.entries = list.slice(0, RECENT_ENTRIES);
      if (series) computed.series = investmentSeries({ currency: item.currency, entries: list }, data, today());
      result.push(computed);
    }
    return result;
  }

  async function ensureMarket(items) {
    const indices = new Set(items.map((item) => item.index));
    const withMep = items.some((item) => item.currency === "ARS");
    await Promise.all([...indices].map((key) => market.ensureFresh(key, { withMep })));
  }

  async function list(userId) {
    const items = await db.all(sql`SELECT ${COLUMNS} FROM investments WHERE user_id = ${userId} ORDER BY id`);
    await ensureMarket(items);
    return withValues(items, { series: true });
  }

  async function get(userId, id, options = { series: true }) {
    const item = await db.one(sql`SELECT ${COLUMNS} FROM investments WHERE user_id = ${userId} AND id = ${id}`);
    if (!item) return null;
    return (await withValues([item], options))[0];
  }

  async function create(userId, data) {
    const { count } = await db.one(sql`SELECT COUNT(*) AS count FROM investments WHERE user_id = ${userId}`);
    if (count >= INVESTMENTS_MAX) throw new HttpError(409, "investments_limit");
    const { id } = await db.one(sql`
      INSERT INTO investments (user_id, name, index_key, currency)
      VALUES (${userId}, ${data.name}, ${data.index}, ${data.currency})
      RETURNING id
    `);
    await market.ensureFresh(data.index, { withMep: data.currency === "ARS" });
    return get(userId, id);
  }

  // El indice y la moneda no se cambian si ya hay aportes (cambiaria todo el calculo).
  async function update(userId, id, data) {
    const current = await get(userId, id, { series: false });
    if (!current) return null;
    if (current.entries.length && (data.currency !== current.currency || data.index !== current.index)) {
      throw new HttpError(400, "validation_error", {
        [data.currency !== current.currency ? "currency" : "index"]: "errorInvestmentLocked",
      });
    }
    await db.run(sql`
      UPDATE investments SET name = ${data.name}, index_key = ${data.index}, currency = ${data.currency}, updated_at = now()
      WHERE user_id = ${userId} AND id = ${id}
    `);
    return get(userId, id);
  }

  // Los gastos e ingresos que se cargaron por los aportes quedan en los movimientos.
  async function remove(userId, id) {
    return (await db.run(sql`DELETE FROM investments WHERE user_id = ${userId} AND id = ${id}`)) > 0;
  }

  /*
  Aporte o rescate. Si registerMovement, carga "Inversión: <nombre>" como gasto
  (en Otros) o "Rescate de inversión: <nombre>" como ingreso (en Otros ingresos).
  La fecha va de hoy hasta INVESTMENT_HISTORY_YEARS años atras. No se puede
  rescatar mas de lo que vale (o de lo aportado, si todavia no hay precios).
  */
  async function addEntry(userId, id, { type, amount, date, registerMovement, paymentMethod }) {
    const item = await get(userId, id, { series: false });
    if (!item) return null;
    const oldest = `${Number(today().slice(0, 4)) - INVESTMENT_HISTORY_YEARS}${today().slice(4)}`;
    if (date > today()) throw new HttpError(400, "validation_error", { date: "errorInvestmentDateFuture" });
    if (date < oldest) throw new HttpError(400, "validation_error", { date: "errorInvestmentDateTooOld" });
    const available = item.value ?? item.invested;
    if (type === "withdraw" && amount > available + 0.001) {
      throw new HttpError(400, "validation_error", { amount: "errorRedeemTooLarge" });
    }
    await db.transaction(async (tx) => {
      let movementId = null;
      if (registerMovement) {
        const deposit = type === "deposit";
        const title = `${deposit ? "Inversión" : "Rescate de inversión"}: ${item.name}`.slice(0, 80);
        ({ id: movementId } = await tx.one(sql`
          INSERT INTO movements (user_id, type, title, amount, currency, date, category, payment_method, note)
          VALUES (${userId}, ${deposit ? "expense" : "income"}, ${title}, ${amount}, ${item.currency}, ${date},
                  ${deposit ? "other" : "otherIncome"}, ${paymentMethod}, '')
          RETURNING id
        `));
      }
      await tx.run(sql`
        INSERT INTO investment_entries (investment_id, amount, date, movement_id)
        VALUES (${id}, ${type === "deposit" ? amount : -amount}, ${date}, ${movementId})
      `);
    });
    return get(userId, id);
  }

  // Borra un aporte o rescate (y el movimiento que genero). No si deja lo aportado en negativo.
  async function removeEntry(userId, id, entryId) {
    const item = await get(userId, id, { series: false });
    if (!item) return null;
    const entry = await db.one(sql`SELECT amount FROM investment_entries WHERE id = ${entryId} AND investment_id = ${id}`);
    if (!entry) return null;
    if (item.invested - entry.amount < -0.001) throw new HttpError(409, "investment_entry_needed");
    await db.transaction(async (tx) => {
      const { movementId } = await tx.one(sql`
        DELETE FROM investment_entries WHERE id = ${entryId} RETURNING movement_id AS "movementId"
      `);
      if (movementId) await tx.run(sql`DELETE FROM movements WHERE id = ${movementId} AND user_id = ${userId}`);
    });
    return get(userId, id);
  }

  // Aportes de la persona (para marcarlos en los graficos): [{ date, amount, currency, name, index }].
  async function purchases(userId) {
    return db.all(sql`
      SELECT e.date, e.amount, i.currency, i.name, i.index_key AS "index"
      FROM investment_entries e JOIN investments i ON i.id = e.investment_id
      WHERE i.user_id = ${userId} AND e.amount > 0
      ORDER BY e.date
    `);
  }

  return { list, get, create, update, remove, addEntry, removeEntry, purchases };
}
