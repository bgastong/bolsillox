import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { formatCompactCurrency, formatCurrency, setAmountsHidden } from "./format.js";

afterEach(() => setAmountsHidden(false));

// Intl usa espacios especiales (NBSP) entre el simbolo y el numero.
const plain = (text) => text.replace(/\s/g, " ");

test("los montos se muestran normal fuera del modo privado", () => {
  assert.equal(plain(formatCurrency(1974500, "es-AR")), "$ 1.974.500");
  assert.equal(plain(formatCurrency(200, "es-AR", { currency: "USD" })), "US$ 200");
});

test("en modo privado se tapan los numeros pero quedan el signo y la moneda", () => {
  setAmountsHidden(true);
  assert.equal(plain(formatCurrency(1974500.5, "es-AR")), "$ ••••");
  assert.equal(plain(formatCurrency(-24500, "es-AR", { signed: true })), "-$ ••••");
  assert.equal(plain(formatCurrency(950000, "es-AR", { signed: true })), "+$ ••••");
  assert.equal(plain(formatCurrency(200, "en-US", { currency: "USD" })), "US$••••");
  assert.equal(plain(formatCompactCurrency(1200000, "es-AR")), "$••••");
  assert.doesNotMatch(formatCompactCurrency(1200000, "es-AR"), /\d|M/);
});
