import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { createErrorReporter } from "./alerts.js";
import { startTestServer } from "./testHelpers.js";

const silent = (fn) => async () => {
  const original = console.error;
  console.error = () => {};
  try {
    await fn();
  } finally {
    console.error = original;
  }
};

function fakeMailer() {
  const sent = [];
  return { sent, enabled: true, async send(email) { sent.push(email); } };
}

describe("aviso de errores por email", () => {
  test("avisa una vez por hora el mismo error", silent(async () => {
    let clock = Date.UTC(2026, 4, 1, 12);
    const mailer = fakeMailer();
    const reporter = createErrorReporter({ mailer, to: "yo@mail.com", now: () => new Date(clock) });
    const error = new Error("se rompio algo");

    assert.equal(await reporter.report({ source: "api", message: error.message, stack: error.stack, details: { ruta: "GET /api/x" } }), true);
    assert.equal(await reporter.report({ source: "api", message: error.message, stack: error.stack }), false);
    assert.equal(mailer.sent.length, 1);
    assert.equal(mailer.sent[0].to, "yo@mail.com");
    assert.match(mailer.sent[0].subject, /se rompio algo/);
    assert.match(mailer.sent[0].text, /ruta: GET \/api\/x/);

    clock += 61 * 60 * 1000;
    assert.equal(await reporter.report({ source: "api", message: error.message, stack: error.stack }), true);
  }));

  test("sin ALERT_EMAIL o sin envio de emails solo queda en los logs", silent(async () => {
    const mailer = fakeMailer();
    assert.equal(await createErrorReporter({ mailer }).report({ source: "api", message: "x" }), false);
    const off = { enabled: false, async send() { throw new Error("no deberia mandar"); } };
    assert.equal(await createErrorReporter({ mailer: off, to: "yo@mail.com" }).report({ source: "api", message: "x" }), false);
    assert.equal(mailer.sent.length, 0);
  }));
});

describe("errores de la pagina", () => {
  let api;
  const mailer = fakeMailer();

  before(async () => {
    api = await startTestServer({ mailer, alertEmail: "yo@mail.com" });
  });

  after(() => api.stop());

  test("la pagina puede avisar un error sin sesion", silent(async () => {
    const res = await api.request("/client-errors", {
      method: "POST",
      body: { message: "TypeError: x is undefined", stack: "at Resumen (app.js:1:1)", url: "/historial" },
    });
    assert.equal(res.status, 204);
    const alert = mailer.sent.find((email) => email.subject.includes("(web)"));
    assert.ok(alert);
    assert.match(alert.text, /página: \/historial/);
  }));

  test("un aviso sin mensaje no se acepta", async () => {
    const res = await api.request("/client-errors", { method: "POST", body: { message: "" } });
    assert.equal(res.status, 400);
  });

  test("tiene limite de avisos por hora", silent(async () => {
    let last;
    for (let index = 0; index < 21; index++) {
      last = await api.request("/client-errors", { method: "POST", body: { message: `error ${index}` } });
    }
    assert.equal(last.status, 429);
  }));
});
