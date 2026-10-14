import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { sessionCookie, startTestServer } from "./testHelpers.js";

// Reloj que el test puede adelantar: arranca el 15 de octubre de 2026.
let clock = new Date(2026, 9, 15, 12);
const setToday = (day, month = 9) => {
  clock = new Date(2026, month, day, 12);
};

// Mailer de prueba: guarda los emails en vez de mandarlos.
const outbox = [];
const mailer = {
  enabled: true,
  fail: false,
  async send(message) {
    if (mailer.fail) throw new Error("sin red");
    outbox.push(message);
  },
};
const reminderEmails = () => outbox.filter((message) => /cuota/i.test(message.subject));

let api;
let cookie;
let email;

before(async () => {
  api = await startTestServer({ now: () => clock, mailer, cronSecret: "secreto-de-prueba" });
  // Con mailer, el registro pide confirmar el email: se confirma con el codigo que llego.
  const res = await api.request("/auth/register", {
    method: "POST",
    body: { name: "Gastón", email: "cuotas@test.com", password: "contraseña-segura", acceptTerms: true },
  });
  email = "cuotas@test.com";
  assert.equal(res.status, 201);
  const code = outbox.at(-1).text.match(/\b\d{6}\b/)[0];
  const verified = await api.request("/auth/verify-email", { method: "POST", body: { email, code } });
  cookie = sessionCookie(verified);
  outbox.length = 0;
});

after(() => api.stop());

const request = (path, options = {}) => api.request(path, { cookie, ...options });
const cron = () => api.request("/cron/reminders", { headers: { Authorization: "Bearer secreto-de-prueba" } });

describe("recordatorios de cuotas por email", () => {
  test("el cron pide la clave", async () => {
    assert.equal((await api.request("/cron/reminders")).status, 401);
    assert.equal((await api.request("/cron/reminders", { headers: { Authorization: "Bearer otra" } })).status, 401);
    assert.equal((await cron()).status, 200);
  });

  test("avisa 2 dias antes, 1 dia antes, el mismo dia y una vez si se vencio, sin repetir", async () => {
    const res = await request("/recurring", {
      method: "POST",
      body: {
        type: "expense", title: "Notebook", amount: 100000, currency: "ARS", category: "shopping",
        paymentMethod: "credit", note: "", kind: "installments", installmentFirst: 1, installmentsTotal: 3,
        startDate: "2026-10-18",
      },
    });
    assert.equal(res.status, 201);

    const subjects = [];
    for (const day of [15, 16, 16, 17, 18, 19, 20, 21]) {
      setToday(day);
      await cron();
      subjects.push(reminderEmails().length);
    }
    // 15: falta 3 dias (nada) · 16: 2 dias (1, y no se repite) · 17: mañana · 18: hoy · 19: vencida · 20-21: nada mas
    assert.deepEqual(subjects, [0, 1, 1, 2, 3, 4, 4, 4]);
    const [d2, d1, d0, overdue] = reminderEmails();
    assert.equal(d2.subject, "Cuota de Notebook (1/3): vence en 2 días");
    assert.equal(d1.subject, "Cuota de Notebook (1/3): vence mañana");
    assert.equal(d0.subject, "Cuota de Notebook (1/3): vence hoy");
    assert.equal(overdue.subject, "Cuota de Notebook (1/3): venció sin pagar");
    assert.equal(overdue.to, email);
    assert.match(overdue.text, /\$\s?100\.000/);
  });

  test("una cuota pagada no avisa y los emails salen en el idioma elegido", async () => {
    setToday(14, 10);
    await api.request("/auth/login", { method: "POST", body: { email, password: "contraseña-segura" } }).then((res) => {
      cookie = sessionCookie(res);
    });
    const [rule] = await (await request("/recurring")).json();
    await request(`/recurring/${rule.id}/pay`, { method: "POST", body: { month: "2026-11" } });
    const before = outbox.length;
    await cron();
    assert.equal(outbox.length, before);

    const saved = await request("/notifications", { method: "PUT", body: { language: "en" } });
    assert.deepEqual(await saved.json(), { installmentEmails: true, language: "en" });
    setToday(16, 11); // la 3.a cuota (18/12) vence en 2 dias
    await api.request("/auth/login", { method: "POST", body: { email, password: "contraseña-segura" } }).then((res) => {
      cookie = sessionCookie(res);
    });
    await cron();
    assert.equal(outbox.at(-1).subject, "Notebook (3/3) installment: due in 2 days");
  });

  test("se pueden apagar desde Ajustes", async () => {
    const off = await request("/notifications", { method: "PUT", body: { installmentEmails: false } });
    assert.equal((await off.json()).installmentEmails, false);
    const before = outbox.length;
    setToday(17, 11);
    await cron();
    assert.equal(outbox.length, before);
    assert.equal((await request("/notifications", { method: "PUT", body: { installmentEmails: "si" } })).status, 400);
  });

  test("si el email no sale, se reintenta en la proxima vuelta", async () => {
    await request("/notifications", { method: "PUT", body: { installmentEmails: true } });
    setToday(18, 11);
    mailer.fail = true;
    await cron();
    mailer.fail = false;
    const before = outbox.length;
    await cron();
    assert.equal(outbox.length, before + 1);
    assert.match(outbox.at(-1).subject, /due today/);
  });
});
