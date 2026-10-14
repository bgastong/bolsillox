import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { sessionCookie, startTestServer } from "./testHelpers.js";

// Reloj que el test puede adelantar: arranca el 15 de octubre de 2026.
let clock = new Date(2026, 9, 15, 12);
const setToday = (day, month = 9) => {
  clock = new Date(2026, month, day, 12);
};

let api;
let cookie;
let email;

before(async () => {
  api = await startTestServer({ now: () => clock });
  ({ cookie, email } = await api.signup());
});

// Al adelantar el reloj mas de 30 dias la sesion vence: se vuelve a entrar.
async function login() {
  const res = await api.request("/auth/login", { method: "POST", body: { email, password: "contraseña-segura" } });
  cookie = sessionCookie(res);
}

after(() => api.stop());

const request = (path, options = {}) => api.request(path, { cookie, ...options });
const json = async (path, options) => (await request(path, options)).json();

const plan = {
  type: "expense",
  title: "Notebook",
  amount: 100000,
  currency: "ARS",
  category: "shopping",
  paymentMethod: "credit",
  note: "",
  kind: "installments",
  installmentFirst: 1,
  installmentsTotal: 3,
};

describe("avisos de cuotas y marcarlas como pagadas", () => {
  let rule;

  test("las cuotas de antes de cargar la compra se dan por pagadas; las nuevas quedan pendientes", async () => {
    // Primera cuota el 10/9 (ya paso, se da por pagada) y la segunda el 10/10.
    // Las dos son anteriores a hoy (15/10): se generan solas como antes.
    const old = await json("/recurring", { method: "POST", body: { ...plan, title: "Viejo", startDate: "2026-09-10" } });
    assert.equal(old.installmentsPaid, 2);
    assert.deepEqual(old.pending, []);

    // Una compra que vence el 16/10: no se carga sola.
    rule = await json("/recurring", { method: "POST", body: { ...plan, startDate: "2026-10-16" } });
    assert.equal(rule.installmentsPaid, 0);
    assert.equal(rule.nextDate, "2026-10-16");
    assert.deepEqual(rule.pending, [{ month: "2026-10", date: "2026-10-16", daysLeft: 1, number: 1 }]);
  });

  test("avisa 2 dias antes, 1 dia antes, el mismo dia y cuando se vencio sin pagar", async () => {
    setToday(14);
    let alerts = await json("/recurring/alerts");
    assert.deepEqual(alerts.map((item) => [item.title, item.number, item.daysLeft]), [["Notebook", 1, 2]]);

    setToday(13);
    assert.deepEqual(await json("/recurring/alerts"), []);

    setToday(16);
    alerts = await json("/recurring/alerts");
    assert.equal(alerts[0].daysLeft, 0);

    // Pasa la fecha sin pagar: no se carga sola y sigue avisando como vencida.
    setToday(20);
    alerts = await json("/recurring/alerts");
    assert.deepEqual(alerts.map((item) => [item.number, item.daysLeft]), [[1, -4]]);
    const movements = await json("/movements?q=Notebook");
    assert.equal(movements.length, 0);
    const current = await json(`/recurring/${rule.id}`);
    assert.equal(current.nextDate, "2026-10-16");
    assert.equal(current.installmentsPaid, 0);
  });

  test("al marcarla como pagada carga el gasto con la fecha de hoy y deja de avisar", async () => {
    const res = await request(`/recurring/${rule.id}/pay`, { method: "POST", body: { month: "2026-10" } });
    assert.equal(res.status, 200);
    const updated = await res.json();
    assert.equal(updated.installmentsPaid, 1);
    assert.equal(updated.nextDate, "2026-11-16");
    assert.deepEqual(updated.pending, []);

    const [movement] = await json("/movements?q=Notebook");
    assert.deepEqual([movement.title, movement.date, movement.amount], ["Notebook (1/3)", "2026-10-20", 100000]);
    assert.deepEqual(await json("/recurring/alerts"), []);

    // Pagarla dos veces no duplica el gasto.
    const again = await request(`/recurring/${rule.id}/pay`, { method: "POST", body: { month: "2026-10" } });
    assert.equal(again.status, 409);
    assert.equal((await json("/movements?q=Notebook")).length, 1);
  });

  test("se puede pagar por adelantado y no acepta meses fuera del plan", async () => {
    setToday(14, 10);
    await login();
    // La 3.a cuota de "Viejo" (10/11) ya cae despues de cargarla: vencida sin pagar.
    const alerts = await json("/recurring/alerts");
    assert.deepEqual(
      alerts.map((item) => [item.title, item.number, item.daysLeft]),
      [["Viejo", 3, -4], ["Notebook", 2, 2]],
    );
    const early = await request(`/recurring/${rule.id}/pay`, { method: "POST", body: { month: "2026-11" } });
    assert.equal(early.status, 200);
    assert.deepEqual((await json("/recurring/alerts")).map((item) => item.title), ["Viejo"]);

    const outside = await request(`/recurring/${rule.id}/pay`, { method: "POST", body: { month: "2027-06" } });
    assert.equal(outside.status, 409);
    const invalid = await request(`/recurring/${rule.id}/pay`, { method: "POST", body: { month: "2026-13" } });
    assert.equal(invalid.status, 400);
    const missing = await request("/recurring/99999/pay", { method: "POST", body: { month: "2026-11" } });
    assert.equal(missing.status, 404);
  });

  test("los recurrentes comunes se siguen cargando solos y no avisan", async () => {
    setToday(15, 10);
    const rent = await json("/recurring", {
      method: "POST",
      body: { ...plan, kind: "recurring", title: "Alquiler", startDate: "2026-11-01", installmentFirst: undefined, installmentsTotal: undefined },
    });
    assert.equal(rent.kind, "recurring");
    assert.equal(rent.pending, undefined);
    assert.equal((await json("/movements?q=Alquiler")).length, 1);
    assert.deepEqual((await json("/recurring/alerts")).map((item) => item.title), ["Viejo"]);
  });
});
