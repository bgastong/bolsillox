import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { codeEmail } from "./emails.js";

describe("email con codigo", () => {
  test("lleva el codigo, el vencimiento y el asunto en el idioma pedido", () => {
    const es = codeEmail({ purpose: "verify_email", code: "123456", language: "es", minutes: 15 });
    assert.equal(es.subject, "Tu código para activar bolsillox");
    assert.match(es.text, /123456/);
    assert.match(es.text, /Vence en 15 minutos/);
    assert.match(es.html, />123456</);
    // La vista previa de la bandeja de entrada muestra el codigo.
    assert.match(es.html, /Tu código es 123456/);

    const en = codeEmail({ purpose: "reset_password", code: "654321", language: "en", minutes: 15 });
    assert.equal(en.subject, "Your password reset code");
    assert.match(en.html, /lang="en"/);
  });

  test("los links del pie usan la URL publica y solo aparecen si hay una", () => {
    const withUrl = codeEmail({
      purpose: "change_email",
      code: "111111",
      minutes: 15,
      appUrl: "https://bolsillox.com.ar",
    });
    assert.match(withUrl.html, /href="https:\/\/bolsillox\.com\.ar\/terminos"/);
    assert.match(withUrl.html, /href="https:\/\/bolsillox\.com\.ar\/privacidad"/);

    const withoutUrl = codeEmail({ purpose: "change_email", code: "111111", minutes: 15 });
    assert.doesNotMatch(withoutUrl.html, /\/terminos/);
  });
});
