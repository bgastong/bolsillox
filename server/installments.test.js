import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { startTestServer } from "./testHelpers.js";

// El reloj de los tests es el 15 de octubre de 2026.
let api;
let cookie;

before(async () => {
  api = await startTestServer();
  ({ cookie } = await api.signup());
});

after(() => api.stop());

const request = (path, options = {}) => api.request(path, { cookie, ...options });
const json = async (path, options) => (await request(path, options)).json();

const base = {
  type: "expense",
  title: "Heladera",
  amount: 1000,
  currency: "ARS",
  category: "shopping",
  paymentMethod: "credit",
  note: "",
};

describe("compras en cuotas", () => {
  test("genera las cuotas que ya vencieron, con el numero en el titulo", async () => {
    const res = await request("/recurring", {
      method: "POST",
      body: { ...base, kind: "installments", installmentFirst: 3, installmentsTotal: 6, startDate: "2026-09-10" },
    });
    assert.equal(res.status, 201);
    const rule = await res.json();
    assert.equal(rule.kind, "installments");
    assert.equal(rule.endDate, "2026-12-10");
    assert.equal(rule.installmentsPaid, 4);
    assert.equal(rule.nextInstallment, 5);
    assert.equal(rule.nextDate, "2026-11-10");
    assert.equal(rule.remainingAmount, 2000);

    const items = await json("/movements?category=shopping&sort=date&order=asc");
    assert.deepEqual(
      items.map((item) => [item.title, item.date]),
      [
        ["Heladera (3/6)", "2026-09-10"],
        ["Heladera (4/6)", "2026-10-10"],
      ],
    );
  });

  test("la ultima cuota termina el plan", async () => {
    const rule = await json("/recurring", {
      method: "POST",
      body: { ...base, title: "Celular", kind: "installments", installmentFirst: 12, installmentsTotal: 12, startDate: "2026-10-01" },
    });
    assert.equal(rule.installmentsPaid, 12);
    assert.equal(rule.nextDate, null);
    assert.equal(rule.remainingAmount, 0);
  });

  test("una cuota a futuro todavia no se carga", async () => {
    const rule = await json("/recurring", {
      method: "POST",
      body: { ...base, title: "Notebook", kind: "installments", installmentFirst: 1, installmentsTotal: 3, startDate: "2026-11-05" },
    });
    assert.equal(rule.installmentsPaid, 0);
    assert.equal(rule.nextInstallment, 1);
    assert.equal(rule.remainingAmount, 3000);
    assert.equal(rule.endDate, "2027-01-05");
  });

  test("valida la cantidad y el numero de cuota", async () => {
    const body = { ...base, kind: "installments", startDate: "2026-10-01" };
    const none = await request("/recurring", { method: "POST", body: { ...body, installmentFirst: 1, installmentsTotal: 0 } });
    assert.equal(none.status, 400);
    assert.equal((await none.json()).fields.installmentsTotal, "errorInstallmentsTotal");
    const past = await request("/recurring", { method: "POST", body: { ...body, installmentFirst: 7, installmentsTotal: 6 } });
    assert.equal((await past.json()).fields.installmentFirst, "errorInstallmentFirst");
  });

  test("una sola cuota para el mes que viene", async () => {
    const rule = await json("/recurring", {
      method: "POST",
      body: { ...base, title: "Pasaje", kind: "installments", installmentFirst: 1, installmentsTotal: 1, startDate: "2026-11-15" },
    });
    assert.equal(rule.kind, "installments");
    assert.equal(rule.endDate, "2026-11-15");
    assert.equal(rule.nextDate, "2026-11-15");
    assert.equal(rule.nextInstallment, 1);
    assert.equal(rule.remainingAmount, 1000);
  });

  test("una sola cuota que ya vencio se carga sin numero en el titulo", async () => {
    await json("/recurring", {
      method: "POST",
      body: { ...base, title: "Seña", kind: "installments", installmentFirst: 1, installmentsTotal: 1, startDate: "2026-10-03" },
    });
    const items = await json("/movements?q=Seña");
    assert.deepEqual(items.map((item) => item.title), ["Seña"]);
  });

  test("un recurrente comun sigue igual", async () => {
    const rule = await json("/recurring", {
      method: "POST",
      body: { ...base, title: "Gimnasio", startDate: "2026-10-01" },
    });
    assert.equal(rule.kind, "recurring");
    assert.equal(rule.installmentsTotal, null);
    assert.equal(rule.endDate, null);
  });
});
