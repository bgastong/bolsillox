import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { startTestServer } from "./testHelpers.js";

// Reloj que el test adelanta: arranca el 15 de octubre de 2026.
let clock = new Date(2026, 9, 15, 12);
let api;
let cookie;

before(async () => {
  api = await startTestServer({ now: () => clock });
  ({ cookie } = await api.signup());
  const movement = { currency: "ARS", paymentMethod: "transfer", note: "" };
  await api.request("/movements", {
    cookie,
    method: "POST",
    body: { ...movement, type: "expense", title: "Super", amount: 1000, date: "2026-10-10", category: "food" },
  });
  await api.request("/movements", {
    cookie,
    method: "POST",
    body: { ...movement, type: "income", title: "Sueldo", amount: 950000, date: "2026-10-20", category: "salary" },
  });
});

after(() => api.stop());

const summary = async (month) => (await api.request(`/summary?month=${month}`, { cookie })).json();

test("un ingreso con fecha futura no esta en el saldo; queda como programado", async () => {
  const data = await summary("2026-10");
  assert.equal(data.balanceDate, "2026-10-15");
  assert.equal(data.balance, -1000);
  assert.deepEqual(data.scheduled, { income: 950000, expense: 0, count: 1, projected: 949000 });
  // Los totales del mes siguen incluyendo todo el mes.
  assert.equal(data.income, 950000);
});

test("cuando llega su dia, el ingreso se suma al saldo", async () => {
  clock = new Date(2026, 9, 20, 12);
  const data = await summary("2026-10");
  assert.equal(data.balance, 949000);
  assert.equal(data.scheduled, null);
});

test("un mes que ya paso cuenta hasta su ultimo dia", async () => {
  clock = new Date(2026, 10, 3, 12);
  const data = await summary("2026-10");
  assert.equal(data.balanceDate, "2026-10-31");
  assert.equal(data.balance, 949000);
  assert.equal(data.scheduled, null);
});
