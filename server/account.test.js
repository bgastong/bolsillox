import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { NOW, sessionCookie, startTestServer } from "./testHelpers.js";

/*
Verificacion de email, recuperar contraseña y cambiar datos.
El servidor usa un mailer falso que guarda los emails y un reloj que los
tests adelantan (para la espera entre codigos y el vencimiento).
*/
let api;
const sent = [];
let clock = NOW.getTime();
const advance = (ms) => {
  clock += ms;
};
const MINUTE = 60 * 1000;

const mailer = {
  enabled: true,
  async send(email) {
    sent.push(email);
  },
};

before(async () => {
  api = await startTestServer({ mailer, now: () => new Date(clock), authLimits: { register: 1000, code: 1000, send: 1000 } });
});

after(() => api.stop());

const post = (path, body, cookie) => api.request(path, { method: "POST", body, cookie });

// Ultimo codigo enviado a un email.
function lastCode(to) {
  const email = [...sent].reverse().find((item) => item.to === to);
  return email?.text.match(/\b\d{6}\b/)?.[0] ?? null;
}

async function registerVerified(email, password = "clave-segura-1") {
  await post("/auth/register", { name: "Ana", email, password, acceptTerms: true });
  const res = await post("/auth/verify-email", { email, code: lastCode(email) });
  assert.equal(res.status, 200);
  advance(2 * MINUTE);
  return sessionCookie(res);
}

describe("verificacion de email al registrarse", () => {
  test("el registro no inicia sesion y manda un codigo", async () => {
    const res = await post("/auth/register", {
      name: "Ana",
      email: "ana@verifica.com",
      password: "clave-segura-1",
      acceptTerms: true,
    });
    assert.equal(res.status, 201);
    assert.deepEqual(await res.json(), { email: "ana@verifica.com", verificationRequired: true });
    assert.equal(sessionCookie(res), null);
    assert.match(lastCode("ana@verifica.com"), /^\d{6}$/);
  });

  test("sin confirmar no se puede entrar", async () => {
    const res = await post("/auth/login", { email: "ana@verifica.com", password: "clave-segura-1" });
    assert.equal(res.status, 403);
    assert.equal((await res.json()).error, "email_not_verified");
  });

  test("un codigo equivocado no sirve", async () => {
    const res = await post("/auth/verify-email", { email: "ana@verifica.com", code: "000000" === lastCode("ana@verifica.com") ? "111111" : "000000" });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, "code_invalid");
  });

  test("con el codigo correcto se confirma e inicia sesion", async () => {
    const code = lastCode("ana@verifica.com");
    const res = await post("/auth/verify-email", { email: "ana@verifica.com", code: `${code.slice(0, 3)} ${code.slice(3)}` });
    assert.equal(res.status, 200);
    assert.ok(sessionCookie(res));
    // El codigo es de un solo uso.
    const again = await post("/auth/verify-email", { email: "ana@verifica.com", code });
    assert.equal(again.status, 400);
    // Y ahora el login funciona.
    const login = await post("/auth/login", { email: "ana@verifica.com", password: "clave-segura-1" });
    assert.equal(login.status, 200);
  });

  test("reenviar el codigo respeta la espera de un minuto", async () => {
    await post("/auth/register", { name: "Leo", email: "leo@verifica.com", password: "clave-segura-1", acceptTerms: true });
    const first = lastCode("leo@verifica.com");
    const tooSoon = await post("/auth/resend-verification", { email: "leo@verifica.com" });
    assert.equal(tooSoon.status, 429);
    assert.equal((await tooSoon.json()).error, "code_cooldown");
    advance(61 * 1000);
    const ok = await post("/auth/resend-verification", { email: "leo@verifica.com" });
    assert.equal(ok.status, 204);
    const second = lastCode("leo@verifica.com");
    // El codigo anterior deja de servir (salvo que coincidan por azar).
    if (first !== second) {
      const old = await post("/auth/verify-email", { email: "leo@verifica.com", code: first });
      assert.equal(old.status, 400);
    }
  });

  test("reenviar a un email desconocido no revela nada", async () => {
    const before = sent.length;
    const res = await post("/auth/resend-verification", { email: "nadie@verifica.com" });
    assert.equal(res.status, 204);
    assert.equal(sent.length, before);
  });

  test("el codigo vence a los 15 minutos", async () => {
    advance(2 * MINUTE);
    await post("/auth/resend-verification", { email: "leo@verifica.com" });
    const code = lastCode("leo@verifica.com");
    advance(16 * MINUTE);
    const res = await post("/auth/verify-email", { email: "leo@verifica.com", code });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, "code_expired");
  });

  test("despues de 5 intentos fallidos el codigo deja de servir", async () => {
    advance(2 * MINUTE);
    await post("/auth/resend-verification", { email: "leo@verifica.com" });
    const code = lastCode("leo@verifica.com");
    const wrong = code === "123456" ? "654321" : "123456";
    let last;
    for (let index = 0; index < 5; index++) {
      last = await post("/auth/verify-email", { email: "leo@verifica.com", code: wrong });
    }
    assert.equal(last.status, 429);
    const right = await post("/auth/verify-email", { email: "leo@verifica.com", code });
    assert.equal(right.status, 400);
  });

  test("una cuenta sin confirmar se puede volver a registrar", async () => {
    advance(2 * MINUTE);
    const res = await post("/auth/register", {
      name: "Leo Nuevo",
      email: "leo@verifica.com",
      password: "otra-clave-22",
      acceptTerms: true,
    });
    assert.equal(res.status, 201);
    const verified = await post("/auth/verify-email", { email: "leo@verifica.com", code: lastCode("leo@verifica.com") });
    assert.equal((await verified.json()).name, "Leo Nuevo");
    // Pero una cuenta confirmada no.
    const taken = await post("/auth/register", { name: "X", email: "leo@verifica.com", password: "12345678", acceptTerms: true });
    assert.equal(taken.status, 409);
  });
});

describe("olvide mi contraseña", () => {
  test("con el codigo se elige otra contraseña y se cierran las sesiones", async () => {
    const oldSession = await registerVerified("rosa@recupera.com");
    const res = await post("/auth/forgot-password", { email: "rosa@recupera.com" });
    assert.equal(res.status, 204);
    const code = lastCode("rosa@recupera.com");

    const reset = await post("/auth/reset-password", { email: "rosa@recupera.com", code, password: "nueva-clave-99" });
    assert.equal(reset.status, 200);
    assert.ok(sessionCookie(reset));
    assert.equal((await api.request("/auth/me", { cookie: oldSession })).status, 401);

    const oldLogin = await post("/auth/login", { email: "rosa@recupera.com", password: "clave-segura-1" });
    assert.equal(oldLogin.status, 401);
    const newLogin = await post("/auth/login", { email: "rosa@recupera.com", password: "nueva-clave-99" });
    assert.equal(newLogin.status, 200);
  });

  test("un email sin cuenta responde igual y no manda nada", async () => {
    const before = sent.length;
    const res = await post("/auth/forgot-password", { email: "fantasma@recupera.com" });
    assert.equal(res.status, 204);
    assert.equal(sent.length, before);
  });

  test("la contraseña nueva se valida", async () => {
    advance(2 * MINUTE);
    await post("/auth/forgot-password", { email: "rosa@recupera.com" });
    const res = await post("/auth/reset-password", {
      email: "rosa@recupera.com",
      code: lastCode("rosa@recupera.com"),
      password: "corta",
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).fields.password, "errorPasswordShort");
  });
});

describe("cambiar datos de la cuenta", () => {
  let cookie;

  before(async () => {
    cookie = await registerVerified("pablo@datos.com");
  });

  test("cambiar el nombre", async () => {
    const res = await api.request("/auth/me", { method: "PATCH", body: { name: "  Pablo Gómez " }, cookie });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).name, "Pablo Gómez");
  });

  test("sin sesion no se pueden cambiar datos", async () => {
    const res = await api.request("/auth/me", { method: "PATCH", body: { name: "X" } });
    assert.equal(res.status, 401);
  });

  test("cambiar la contraseña pide la actual y cierra las otras sesiones", async () => {
    const other = sessionCookie(await post("/auth/login", { email: "pablo@datos.com", password: "clave-segura-1" }));

    const wrong = await post("/auth/change-password", { currentPassword: "mala", newPassword: "otra-clave-33" }, cookie);
    assert.equal(wrong.status, 400);
    assert.equal((await wrong.json()).error, "wrong_password");

    const ok = await post("/auth/change-password", { currentPassword: "clave-segura-1", newPassword: "otra-clave-33" }, cookie);
    assert.equal(ok.status, 200);
    assert.equal((await api.request("/auth/me", { cookie })).status, 200);
    assert.equal((await api.request("/auth/me", { cookie: other })).status, 401);
  });

  test("cambiar el email: codigo al email nuevo", async () => {
    const wrongPassword = await post("/auth/change-email", { email: "pablo@nuevo.com", password: "mala" }, cookie);
    assert.equal(wrongPassword.status, 400);

    const taken = await post("/auth/change-email", { email: "rosa@recupera.com", password: "otra-clave-33" }, cookie);
    assert.equal(taken.status, 409);

    const res = await post("/auth/change-email", { email: "pablo@nuevo.com", password: "otra-clave-33" }, cookie);
    assert.equal(res.status, 204);
    const code = lastCode("pablo@nuevo.com");
    assert.match(code, /^\d{6}$/);

    const confirm = await post("/auth/confirm-email-change", { code }, cookie);
    assert.equal(confirm.status, 200);
    assert.equal((await confirm.json()).email, "pablo@nuevo.com");
    const login = await post("/auth/login", { email: "pablo@nuevo.com", password: "otra-clave-33" });
    assert.equal(login.status, 200);
  });
});

describe("sin envio de emails", () => {
  test("el registro entra directo y recuperar la contraseña no esta disponible", async () => {
    const plain = await startTestServer();
    try {
      const config = await (await plain.request("/auth/config")).json();
      assert.equal(config.email, false);
      const res = await plain.request("/auth/register", {
        method: "POST",
        body: { name: "Sol", email: "sol@sinmail.com", password: "12345678", acceptTerms: true },
      });
      assert.equal(res.status, 201);
      assert.equal((await res.json()).verificationRequired, false);
      assert.ok(sessionCookie(res));
      const forgot = await plain.request("/auth/forgot-password", { method: "POST", body: { email: "sol@sinmail.com" } });
      assert.equal(forgot.status, 503);
    } finally {
      await plain.stop();
    }
  });
});
