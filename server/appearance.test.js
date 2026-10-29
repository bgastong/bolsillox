import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { DEFAULT_APPEARANCE } from "../shared/appearance.js";
import { startTestServer } from "./testHelpers.js";

let api;
let cookie;
let otherCookie;

before(async () => {
  api = await startTestServer();
  ({ cookie } = await api.signup());
  ({ cookie: otherCookie } = await api.signup());
});

after(() => api.stop());

const request = (path, options = {}) => api.request(path, { cookie, ...options });

test("sin elegir nada, vienen los colores por defecto", async () => {
  assert.deepEqual(await (await request("/appearance")).json(), DEFAULT_APPEARANCE);
});

test("se guarda la paleta y donde se ve el color de los gastos, por usuario", async () => {
  const choice = {
    palette: "contraste",
    expenseColor: { list: true, balanceBar: false, cashflow: true, due: false, monthTotal: true },
    categoryChart: { type: "bars", labels: "amount", top: 5 },
  };
  const res = await request("/appearance", { method: "PUT", body: choice });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), choice);
  assert.deepEqual(await (await request("/appearance")).json(), choice);
  assert.deepEqual(await (await api.request("/appearance", { cookie: otherCookie })).json(), DEFAULT_APPEARANCE);
});

test("valida la paleta y los interruptores", async () => {
  const bad = await request("/appearance", {
    method: "PUT",
    body: { palette: "fucsia", expenseColor: { list: "si" } },
  });
  assert.equal(bad.status, 400);
  assert.equal((await api.request("/appearance")).status, 401);
});

test("el grafico por categoria es opcional y se valida", async () => {
  const base = { palette: "clasica", expenseColor: DEFAULT_APPEARANCE.expenseColor };
  // Sin categoryChart (una version anterior de la app): queda el de siempre.
  const old = await request("/appearance", { method: "PUT", body: base });
  assert.equal(old.status, 200);
  assert.deepEqual((await old.json()).categoryChart, DEFAULT_APPEARANCE.categoryChart);
  const bad = await request("/appearance", { method: "PUT", body: { ...base, categoryChart: { type: "radar", labels: "percent", top: 3 } } });
  assert.equal(bad.status, 400);
});
