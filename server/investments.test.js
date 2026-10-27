import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { investmentSeries, investmentValue } from "./investments.js";
import { governmentTerms } from "./routes/investments.js";
import { parseMepHistory, parseStooqCsv, parseYahooChart, priceOn } from "./market.js";
import { FAKE_RATES, startTestServer } from "./testHelpers.js";

// S&P 500 simulado: 5000 el 1/9, 5500 el 1/10, 6000 el 14/10 (y ahora).
const CLOSES = [
  ["2026-09-01", 5000],
  ["2026-10-01", 5500],
  ["2026-10-14", 6000],
];
const ts = (date) => Date.parse(`${date}T20:00:00Z`) / 1000;
const YAHOO = {
  chart: {
    result: [
      {
        meta: { regularMarketPrice: 6000, chartPreviousClose: 5900, regularMarketTime: ts("2026-10-14"), exchangeTimezoneName: "America/New_York" },
        timestamp: CLOSES.map(([date]) => ts(date)),
        indicators: { quote: [{ close: CLOSES.map(([, close]) => close) }] },
      },
    ],
  },
};
const STOOQ = `Date,Open,High,Low,Close,Volume\n2026-09-01,1,1,1,4000,0\n2026-10-14,1,1,1,4400,0\n`;
const MEP = [
  { casa: "bolsa", compra: 990, venta: 1000, fecha: "2026-09-01" },
  { casa: "bolsa", compra: 1090, venta: 1100, fecha: "2026-10-01" },
];

const BLUE = [
  { casa: "blue", venta: 14, fecha: "2015-12-01" },
  { casa: "blue", venta: 70, fecha: "2019-12-01" },
  { casa: "blue", venta: 1000, fecha: "2023-12-01" },
  { casa: "blue", venta: 1200, fecha: "2026-10-01" },
];

const market = { yahooFails: false, calls: 0 };
const json = (data) => ({ ok: true, status: 200, json: async () => data, text: async () => JSON.stringify(data) });
async function fakeFetch(url) {
  if (url.includes("finance.yahoo")) {
    market.calls++;
    if (market.yahooFails) return { ok: false, status: 429 };
    return json(YAHOO);
  }
  if (url.includes("stooq")) return { ok: true, status: 200, text: async () => STOOQ };
  if (url.includes("argentinadatos")) return json(url.endsWith("/blue") ? BLUE : MEP);
  return json(FAKE_RATES);
}

describe("datos de mercado", () => {
  test("lee el grafico de Yahoo con la fecha de la bolsa", () => {
    const { points, quote } = parseYahooChart(YAHOO);
    assert.deepEqual(points.at(-1), { date: "2026-10-14", close: 6000 });
    assert.deepEqual([quote.price, quote.previousClose], [6000, 5900]);
  });

  test("lee el CSV de Stooq y el MEP historico", () => {
    assert.deepEqual(parseStooqCsv(STOOQ).at(-1), { date: "2026-10-14", close: 4400 });
    assert.deepEqual(parseMepHistory(MEP)[1], { date: "2026-10-01", close: 1100 });
    assert.throws(() => parseYahooChart({}));
  });

  test("busca el ultimo precio de ese dia o antes (fines de semana)", () => {
    const series = CLOSES.map(([date, close]) => ({ date, close }));
    assert.equal(priceOn(series, "2026-09-15"), 5000);
    assert.equal(priceOn(series, "2026-10-01"), 5500);
    assert.equal(priceOn(series, "2026-08-01"), null);
  });
});

describe("dolar por gobierno", () => {
  test("cuanto subio en cada mandato con datos (los de menos de 60 dias de datos no van)", () => {
    const series = BLUE.map((item) => ({ date: item.fecha, close: item.venta }));
    const terms = governmentTerms(series, "2026-10-15");
    assert.deepEqual(
      terms.map((term) => [term.key, term.from, term.to, term.changePercent, term.partial]),
      [
        ["macri", 14, 70, 400, false],
        ["afernandez", 70, 1000, 1328.57, false],
        ["milei", 1000, 1200, 20, false],
      ],
    );
  });
});

describe("valor de una inversion", () => {
  const data = {
    prices: CLOSES.map(([date, close]) => ({ date, close })),
    mep: MEP.map((item) => ({ date: item.fecha, close: item.venta })),
    mepNow: 1150,
    priceNow: 6000,
  };

  test("en dolares sigue solo al indice", () => {
    const result = investmentValue({ currency: "USD", entries: [{ amount: 100, date: "2026-10-01" }] }, data);
    assert.deepEqual([result.invested, result.value, result.gain, result.gainPercent], [100, 109.09, 9.09, 9.09]);
  });

  test("en pesos suma tambien la suba del dolar", () => {
    // $ 100.000 / 1000 = US$ 100 -> 0,02 unidades a 5000 -> hoy 0,02 * 6000 * 1150.
    const result = investmentValue({ currency: "ARS", entries: [{ amount: 100000, date: "2026-09-01" }] }, data);
    assert.deepEqual([result.invested, result.value, result.gain, result.gainPercent], [100000, 138000, 38000, 38]);
  });

  test("un rescate vende unidades al precio de ese dia", () => {
    const entries = [
      { amount: 100, date: "2026-09-01" },
      { amount: -55, date: "2026-10-01" },
    ];
    // 0,02 unidades; se venden 0,01 a 5500; queda 0,01 * 6000.
    const result = investmentValue({ currency: "USD", entries }, data);
    assert.deepEqual([result.invested, result.value], [45, 60]);
  });

  test("la serie va de un aporte a hoy, con lo aportado y lo que valia", () => {
    const series = investmentSeries({ currency: "USD", entries: [{ amount: 100, date: "2026-09-01" }] }, data, "2026-10-15");
    assert.deepEqual(
      series.map((point) => [point.date, point.invested, point.value]),
      [
        ["2026-09-01", 100, 100],
        ["2026-10-01", 100, 110],
        ["2026-10-14", 100, 120],
        ["2026-10-15", 100, 120],
      ],
    );
  });

  test("sin precios queda pendiente", () => {
    const result = investmentValue({ currency: "USD", entries: [{ amount: 100, date: "2026-10-01" }] }, { ...data, prices: [], priceNow: null });
    assert.equal(result.pending, true);
    assert.equal(result.invested, 100);
  });
});

let api;
let cookie;
let otherCookie;

before(async () => {
  api = await startTestServer({ fetchImpl: fakeFetch });
  ({ cookie } = await api.signup());
  ({ cookie: otherCookie } = await api.signup());
  // Carga la cotizacion del dia (MEP 1150 en FAKE_RATES).
  await api.request("/rates", { cookie });
});

after(() => api.stop());

const request = (path, options = {}) => api.request(path, { cookie, ...options });
const getJson = async (path, options) => (await request(path, options)).json();

describe("inversiones", () => {
  let item;

  test("se crea una inversion en pesos al S&P 500", async () => {
    const res = await request("/investments", { method: "POST", body: { name: "S&P mensual", index: "sp500", currency: "ARS" } });
    assert.equal(res.status, 201);
    item = await res.json();
    assert.deepEqual([item.name, item.index, item.currency, item.invested, item.value], ["S&P mensual", "sp500", "ARS", 0, 0]);
  });

  test("un aporte se resta del saldo y sigue al indice", async () => {
    const res = await request(`/investments/${item.id}/entries`, {
      method: "POST",
      body: { amount: 100000, date: "2026-09-01" },
    });
    assert.equal(res.status, 200);
    item = await res.json();
    assert.deepEqual([item.invested, item.value, item.gain, item.pending], [100000, 138000, 38000, false]);
    assert.ok(item.series.length >= 3);

    const [expense] = await getJson(`/movements?q=${encodeURIComponent("Inversión")}`);
    assert.deepEqual([expense.type, expense.title, expense.amount], ["expense", "Inversión: S&P mensual", 100000]);
  });

  test("no se aporta en el futuro ni se rescata mas de lo que vale", async () => {
    const future = await request(`/investments/${item.id}/entries`, { method: "POST", body: { amount: 10, date: "2026-11-01" } });
    assert.equal((await future.json()).fields.date, "errorInvestmentDateFuture");

    const tooMuch = await request(`/investments/${item.id}/entries`, {
      method: "POST",
      body: { type: "withdraw", amount: 200000, date: "2026-10-15" },
    });
    assert.equal((await tooMuch.json()).fields.amount, "errorRedeemTooLarge");
  });

  test("la moneda no se cambia si ya hay aportes", async () => {
    const res = await request(`/investments/${item.id}`, { method: "PUT", body: { name: "S&P", index: "sp500", currency: "USD" } });
    assert.equal((await res.json()).fields.currency, "errorInvestmentLocked");
  });

  test("los graficos marcan cada compra con el precio de ese dia", async () => {
    const index = await getJson("/market/sp500?range=max");
    assert.deepEqual(
      index.purchases.map((item) => [item.date, item.price, item.amount, item.name]),
      [["2026-09-01", 5000, 100000, "S&P mensual"]],
    );
    const dollar = await getJson("/market/dollar?source=blue");
    assert.deepEqual(dollar.purchases.map((item) => [item.date, item.price]), [["2026-09-01", 1000]]);
    assert.equal(dollar.terms.at(-1).key, "milei");
    assert.equal(dollar.price, 1200);
  });

  test("borrar el aporte borra su gasto", async () => {
    const res = await request(`/investments/${item.id}/entries/${item.entries[0].id}`, { method: "DELETE" });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).invested, 0);
    assert.equal((await getJson(`/movements?q=${encodeURIComponent("Inversión")}`)).length, 0);
  });

  test("el historico del indice trae el precio de hoy al final", async () => {
    const data = await getJson("/market/sp500?range=max");
    assert.equal(data.name, "S&P 500");
    assert.equal(data.price, 6000);
    assert.equal(Math.round(data.changePercent * 100) / 100, 1.69);
    assert.deepEqual(data.points.at(-1), { date: "2026-10-15", close: 6000, live: true });
    assert.equal((await request("/market/nasdaq")).status, 404);
  });

  test("otra persona no ve ni toca la inversion", async () => {
    assert.deepEqual(await (await api.request("/investments", { cookie: otherCookie })).json(), []);
    const res = await api.request(`/investments/${item.id}/entries`, {
      cookie: otherCookie,
      method: "POST",
      body: { amount: 10, date: "2026-10-15" },
    });
    assert.equal(res.status, 404);
  });
});

describe("si Yahoo no responde", () => {
  let server;
  before(async () => {
    market.yahooFails = true;
    server = await startTestServer({ fetchImpl: fakeFetch });
  });
  after(async () => {
    market.yahooFails = false;
    await server.stop();
  });

  test("el historial sale de Stooq", async () => {
    const { cookie: other } = await server.signup();
    const data = await (await server.request("/market/sp500?range=max", { cookie: other })).json();
    assert.equal(data.price, 4400);
    assert.equal(data.points[0].close, 4000);
  });
});
