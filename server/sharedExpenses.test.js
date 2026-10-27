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

const dinner = {
  type: "expense",
  title: "Cena en lo de Juan",
  amount: 90000,
  currency: "ARS",
  date: "2026-10-10",
  category: "food",
  paymentMethod: "debit",
  split: {
    people: [
      { person: "Ana", amount: 30000 },
      { person: "Leo", amount: 30000 },
    ],
  },
};

describe("gastos compartidos", () => {
  let created;

  test("se carga el gasto completo y una deuda por cada persona", async () => {
    const res = await request("/movements/shared", { method: "POST", body: dinner });
    assert.equal(res.status, 201);
    created = await res.json();
    assert.deepEqual([created.owed, created.myShare, created.people], [60000, 30000, 2]);
    assert.deepEqual([created.movement.title, created.movement.amount, created.movement.type], ["Cena en lo de Juan", 90000, "expense"]);

    const receivables = await json("/receivables");
    assert.deepEqual(
      receivables.map((item) => [item.person, item.concept, item.amount, item.date, item.movementId]).sort(),
      [
        ["Ana", "Cena en lo de Juan", 30000, "2026-10-10", created.movementId],
        ["Leo", "Cena en lo de Juan", 30000, "2026-10-10", created.movementId],
      ],
    );
  });

  test("el historial dice con cuantas personas se dividio", async () => {
    const [movement] = await json("/movements?q=Cena");
    assert.equal(movement.sharedWith, 2);
  });

  test("las partes no pueden sumar mas que el gasto", async () => {
    const res = await request("/movements/shared", {
      method: "POST",
      body: { ...dinner, split: { people: [{ person: "Ana", amount: 95000 }] } },
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).fields.split, "errorSplitTooLarge");
  });

  test("valida que haya personas con nombre y que sea un gasto", async () => {
    const empty = await request("/movements/shared", { method: "POST", body: { ...dinner, split: { people: [] } } });
    assert.equal((await empty.json()).fields.split, "errorSplitPeople");

    const noName = await request("/movements/shared", {
      method: "POST",
      body: { ...dinner, split: { people: [{ person: " ", amount: 10 }] } },
    });
    assert.equal(noName.status, 400);

    const income = await request("/movements/shared", {
      method: "POST",
      body: { ...dinner, type: "income", category: "salary" },
    });
    assert.equal((await income.json()).fields.type, "errorSplitOnlyExpenses");
  });

  test("si se borra el gasto, las deudas quedan", async () => {
    await request(`/movements/${created.movementId}`, { method: "DELETE" });
    const receivables = await json("/receivables");
    assert.equal(receivables.length, 2);
    assert.ok(receivables.every((item) => item.movementId === null));
  });

  test("cada cuenta ve solo lo suyo", async () => {
    assert.deepEqual(await (await api.request("/receivables", { cookie: otherCookie })).json(), []);
  });
});
