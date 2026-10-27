import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { goalProgress } from "./goals.js";
import { startTestServer } from "./testHelpers.js";

describe("progreso de una meta", () => {
  const today = "2026-10-15";

  test("sin fecha: cuanto se lleva y cuanto falta", () => {
    const progress = goalProgress({ target: 1000, deadline: null, entries: [{ amount: 250, date: "2026-09-01" }] }, today);
    assert.deepEqual(
      [progress.saved, progress.remaining, progress.percent, progress.status, progress.perMonth],
      [250, 750, 25, "open", null],
    );
  });

  test("con fecha: lo que faltaba al empezar el mes, repartido entre los meses que quedan", () => {
    // Faltaban 900 el 1 de octubre; quedan octubre, noviembre y diciembre: 300 por mes.
    const entries = [
      { amount: 100, date: "2026-09-10" },
      { amount: 120, date: "2026-10-05" },
    ];
    const progress = goalProgress({ target: 1000, deadline: "2026-12-20", entries }, today);
    assert.deepEqual(
      [progress.monthsLeft, progress.perMonth, progress.thisMonth, progress.thisMonthLeft, progress.status],
      [3, 300, 120, 180, "behind"],
    );
  });

  test("al aportar lo del mes queda al dia", () => {
    const entries = [{ amount: 500, date: "2026-10-02" }];
    const progress = goalProgress({ target: 1000, deadline: "2026-11-30", entries }, today);
    assert.deepEqual([progress.perMonth, progress.thisMonthLeft, progress.status], [500, 0, "onTrack"]);
  });

  test("cumplida y vencida", () => {
    assert.equal(goalProgress({ target: 100, deadline: "2026-01-01", entries: [{ amount: 100, date: "2025-12-01" }] }, today).status, "done");
    assert.equal(goalProgress({ target: 100, deadline: "2026-10-01", entries: [] }, today).status, "overdue");
  });
});

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

const trip = { name: "Vacaciones", target: 800000, currency: "ARS", deadline: "2027-03-15", icon: "plane" };

describe("metas de ahorro", () => {
  let goal;

  test("se crean sin nada ahorrado", async () => {
    const res = await request("/goals", { method: "POST", body: trip });
    assert.equal(res.status, 201);
    goal = await res.json();
    assert.deepEqual(
      [goal.name, goal.target, goal.saved, goal.remaining, goal.icon, goal.status, goal.monthsLeft],
      ["Vacaciones", 800000, 0, 800000, "plane", "behind", 6],
    );
  });

  test("validan nombre, monto e icono", async () => {
    const res = await request("/goals", { method: "POST", body: { ...trip, name: " ", target: 0, icon: "x" } });
    assert.equal(res.status, 400);
    const { fields } = await res.json();
    assert.deepEqual([fields.name, fields.target, fields.icon], ["errorGoalNameRequired", "errorAmountPositive", "errorGoalIconInvalid"]);
  });

  test("un aporte suma a la meta y se carga como gasto", async () => {
    const res = await request(`/goals/${goal.id}/entries`, {
      method: "POST",
      body: { type: "deposit", amount: 150000, date: "2026-10-10", paymentMethod: "transfer" },
    });
    assert.equal(res.status, 200);
    goal = await res.json();
    assert.deepEqual([goal.saved, goal.remaining, goal.thisMonth, goal.entries.length], [150000, 650000, 150000, 1]);

    const [expense] = await json("/movements?q=Ahorro");
    assert.deepEqual(
      [expense.type, expense.title, expense.amount, expense.category],
      ["expense", "Ahorro: Vacaciones", 150000, "other"],
    );
  });

  test("un retiro resta y no puede ser mayor a lo ahorrado", async () => {
    const tooMuch = await request(`/goals/${goal.id}/entries`, {
      method: "POST",
      body: { type: "withdraw", amount: 200000, date: "2026-10-12" },
    });
    assert.equal(tooMuch.status, 400);
    assert.equal((await tooMuch.json()).fields.amount, "errorWithdrawTooLarge");

    const res = await request(`/goals/${goal.id}/entries`, {
      method: "POST",
      body: { type: "withdraw", amount: 50000, date: "2026-10-12", registerMovement: false },
    });
    goal = await res.json();
    assert.equal(goal.saved, 100000);
    assert.equal(goal.entries[0].amount, -50000);
    assert.equal((await json("/movements?q=Retiro")).length, 0);
  });

  test("borrar un aporte borra tambien su gasto, si la meta no queda en negativo", async () => {
    const deposit = goal.entries.find((entry) => entry.amount > 0);
    const withdraw = goal.entries.find((entry) => entry.amount < 0);
    const blocked = await request(`/goals/${goal.id}/entries/${deposit.id}`, { method: "DELETE" });
    assert.equal(blocked.status, 409);

    await request(`/goals/${goal.id}/entries/${withdraw.id}`, { method: "DELETE" });
    const res = await request(`/goals/${goal.id}/entries/${deposit.id}`, { method: "DELETE" });
    assert.equal(res.status, 200);
    goal = await res.json();
    assert.deepEqual([goal.saved, goal.entries.length], [0, 0]);
    assert.equal((await json("/movements?q=Ahorro")).length, 0);
  });

  test("la moneda no se cambia si ya hay aportes", async () => {
    await request(`/goals/${goal.id}/entries`, { method: "POST", body: { amount: 1000, date: "2026-10-14", registerMovement: false } });
    const res = await request(`/goals/${goal.id}`, { method: "PUT", body: { ...trip, currency: "USD" } });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).fields.currency, "errorGoalCurrencyLocked");

    const ok = await request(`/goals/${goal.id}`, { method: "PUT", body: { ...trip, name: "Viaje", target: 900000 } });
    assert.equal((await ok.json()).name, "Viaje");
  });

  test("las cumplidas van al final", async () => {
    const { id } = await json("/goals", { method: "POST", body: { name: "Auriculares", target: 1000, deadline: "" } });
    await request(`/goals/${id}/entries`, { method: "POST", body: { amount: 1000, date: "2026-10-15" } });
    const list = await json("/goals");
    assert.deepEqual(
      list.map((item) => [item.name, item.status]),
      [
        ["Viaje", "behind"],
        ["Auriculares", "done"],
      ],
    );
  });

  test("otra persona no ve ni toca las metas", async () => {
    assert.deepEqual(await (await api.request("/goals", { cookie: otherCookie })).json(), []);
    const res = await api.request(`/goals/${goal.id}/entries`, {
      cookie: otherCookie,
      method: "POST",
      body: { amount: 10, date: "2026-10-15" },
    });
    assert.equal(res.status, 404);
    assert.equal((await api.request(`/goals/${goal.id}`, { cookie: otherCookie, method: "DELETE" })).status, 404);
  });

  test("al borrar la meta los movimientos quedan", async () => {
    await request(`/goals/${goal.id}/entries`, { method: "POST", body: { amount: 5000, date: "2026-10-15" } });
    assert.equal((await request(`/goals/${goal.id}`, { method: "DELETE" })).status, 204);
    assert.equal((await json(`/movements?q=${encodeURIComponent("Ahorro: Viaje")}`)).length, 1);
    assert.equal((await json("/goals")).length, 1);
  });
});
