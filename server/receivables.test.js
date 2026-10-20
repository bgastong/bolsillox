import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
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
const json = async (path, options) => (await request(path, options)).json();

const debt = { person: "Juan", concept: "Cena", amount: 30000, currency: "ARS", date: "2026-10-01", dueDate: "2026-10-20" };

describe("deudas que me deben", () => {
  let item;

  test("se crean con lo que falta cobrar", async () => {
    const res = await request("/receivables", { method: "POST", body: debt });
    assert.equal(res.status, 201);
    item = await res.json();
    assert.deepEqual(
      [item.person, item.concept, item.amount, item.paid, item.remaining, item.status, item.dueDate],
      ["Juan", "Cena", 30000, 0, 30000, "open", "2026-10-20"],
    );
  });

  test("valida persona, monto y que el vencimiento no sea antes", async () => {
    const res = await request("/receivables", {
      method: "POST",
      body: { ...debt, person: " ", amount: -5, dueDate: "2026-09-01" },
    });
    assert.equal(res.status, 400);
    const { fields } = await res.json();
    assert.equal(fields.person, "errorPersonRequired");
    assert.equal(fields.amount, "errorAmountPositive");
  });

  test("un cobro parcial se carga como ingreso y descuenta lo que falta", async () => {
    const res = await request(`/receivables/${item.id}/payments`, {
      method: "POST",
      body: { amount: 10000, date: "2026-10-05", paymentMethod: "cash" },
    });
    assert.equal(res.status, 200);
    const updated = await res.json();
    assert.deepEqual([updated.paid, updated.remaining, updated.status], [10000, 20000, "open"]);

    const [income] = await json("/movements?q=Cobro");
    assert.deepEqual(
      [income.type, income.title, income.amount, income.date, income.category, income.paymentMethod],
      ["income", "Cobro: Juan (Cena)", 10000, "2026-10-05", "otherIncome", "cash"],
    );
  });

  test("no deja cobrar mas de lo que falta; sin cargar el ingreso tambien se puede", async () => {
    const tooMuch = await request(`/receivables/${item.id}/payments`, {
      method: "POST",
      body: { amount: 25000, date: "2026-10-06" },
    });
    assert.equal(tooMuch.status, 400);
    assert.equal((await tooMuch.json()).fields.amount, "errorPaymentTooLarge");

    const rest = await json(`/receivables/${item.id}/payments`, {
      method: "POST",
      body: { amount: 20000, date: "2026-10-06", registerIncome: false },
    });
    assert.deepEqual([rest.remaining, rest.status], [0, "paid"]);
    assert.equal((await json("/movements?q=Cobro")).length, 1);

    const again = await request(`/receivables/${item.id}/payments`, {
      method: "POST",
      body: { amount: 1, date: "2026-10-07" },
    });
    assert.equal(again.status, 409);
  });

  test("las cobradas van al final y no se puede bajar el monto por debajo de lo cobrado", async () => {
    await request("/receivables", { method: "POST", body: { ...debt, person: "Ana", dueDate: null } });
    const list = await json("/receivables");
    assert.deepEqual(list.map((entry) => [entry.person, entry.status]), [["Ana", "open"], ["Juan", "paid"]]);

    const lower = await request(`/receivables/${item.id}`, { method: "PUT", body: { ...debt, amount: 5000 } });
    assert.equal(lower.status, 400);
    assert.equal((await lower.json()).fields.amount, "errorAmountBelowPaid");
  });

  test("cada persona ve solo sus deudas; al borrar, los ingresos cargados quedan", async () => {
    const foreign = await api.request(`/receivables/${item.id}`, { cookie: otherCookie, method: "DELETE" });
    assert.equal(foreign.status, 404);
    assert.deepEqual(await (await api.request("/receivables", { cookie: otherCookie })).json(), []);

    assert.equal((await request(`/receivables/${item.id}`, { method: "DELETE" })).status, 204);
    assert.equal((await json("/receivables")).length, 1);
    assert.equal((await json("/movements?q=Cobro")).length, 1);
  });
});

describe("avisos de lo que me tienen que pagar", () => {
  let clock = new Date(2026, 9, 15, 12);
  let alertsApi;
  let alertsCookie;
  const get = async (path) => (await alertsApi.request(path, { cookie: alertsCookie })).json();
  const create = (body) => alertsApi.request("/receivables", { cookie: alertsCookie, method: "POST", body });

  before(async () => {
    alertsApi = await startTestServer({ now: () => clock });
    ({ cookie: alertsCookie } = await alertsApi.signup());
    const base = { amount: 1000, currency: "ARS", date: "2026-10-01" };
    await create({ ...base, person: "Lejos", dueDate: "2026-10-30" });
    await create({ ...base, person: "Pasado", dueDate: "2026-10-17" });
    await create({ ...base, person: "Hoy", dueDate: "2026-10-15" });
    await create({ ...base, person: "Vencida", dueDate: "2026-10-10" });
    await create({ ...base, person: "Sin fecha", dueDate: null });
  });

  after(() => alertsApi.stop());

  test("muestra las que vencen en 2 dias, hoy o ya vencieron, con los dias que faltan", async () => {
    const alerts = await get("/receivables/alerts");
    assert.deepEqual(
      alerts.map((item) => [item.person, item.daysLeft, item.remaining]),
      [["Vencida", -5, 1000], ["Hoy", 0, 1000], ["Pasado", 2, 1000]],
    );
  });

  test("las cobradas dejan de avisar y un cobro parcial avisa lo que falta", async () => {
    const [overdue, todayItem] = await get("/receivables/alerts");
    await alertsApi.request(`/receivables/${overdue.id}/payments`, {
      cookie: alertsCookie,
      method: "POST",
      body: { amount: 1000, date: "2026-10-15", registerIncome: false },
    });
    await alertsApi.request(`/receivables/${todayItem.id}/payments`, {
      cookie: alertsCookie,
      method: "POST",
      body: { amount: 400, date: "2026-10-15", registerIncome: false },
    });
    const alerts = await get("/receivables/alerts");
    assert.deepEqual(alerts.map((item) => [item.person, item.remaining]), [["Hoy", 600], ["Pasado", 1000]]);
  });

  test("con el paso de los dias aparecen las que se acercan", async () => {
    clock = new Date(2026, 9, 28, 12);
    const alerts = await get("/receivables/alerts");
    assert.deepEqual(alerts.map((item) => [item.person, item.daysLeft]), [["Hoy", -13], ["Pasado", -11], ["Lejos", 2]]);
  });
});
