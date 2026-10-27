import assert from "node:assert/strict";
import { test } from "node:test";
import { caretAfter, formatAmount, parseAmountInput, separatorsFor } from "./amountInput.js";

const es = separatorsFor("es-AR");
const en = separatorsFor("en-US");

test("separadores segun el idioma", () => {
  assert.deepEqual(es, { group: ".", decimal: "," });
  assert.deepEqual(en, { group: ",", decimal: "." });
});

test("pone los puntos de miles", () => {
  assert.equal(formatAmount("1000", es), "1.000");
  assert.equal(formatAmount("1250000.5", es), "1.250.000,5");
  assert.equal(formatAmount("12.", es), "12,");
  assert.equal(formatAmount("1000", en), "1,000");
  assert.equal(formatAmount("", es), "");
});

test("al escribir un digito mas, se reagrupa y el cursor queda al final", () => {
  // Habia "100" y se escribe "0": el campo queda "1000".
  const { raw, before } = parseAmountInput("1000", 4, "0", es);
  assert.deepEqual([raw, before], ["1000", 4]);
  const text = formatAmount(raw, es);
  assert.equal(text, "1.000");
  assert.equal(caretAfter(text, before, es), 5);
});

test("punto o coma son la coma decimal", () => {
  assert.equal(parseAmountInput("1.000.", 6, ".", es).raw, "1000.");
  assert.equal(parseAmountInput("1.000,", 6, ",", es).raw, "1000.");
  assert.equal(parseAmountInput("1.000,505", 9, "5", es).raw, "1000.50");
  assert.equal(parseAmountInput(",", 1, ",", es).raw, "0.");
});

test("al borrar un digito en el medio, el cursor no salta", () => {
  // "1.234.567" y se borra el 4 (cursor despues del 3): "1.23.567".
  const { raw, before } = parseAmountInput("1.23.567", 4, null, es);
  assert.equal(raw, "123567");
  const text = formatAmount(raw, es);
  assert.equal(text, "123.567");
  assert.equal(caretAfter(text, before, es), 3);
});

test("pegar con o sin miles", () => {
  assert.equal(parseAmountInput("1.234,56", 8, null, es).raw, "1234.56");
  assert.equal(parseAmountInput("1234.56", 7, null, es).raw, "1234.56");
  assert.equal(parseAmountInput("$ 25.000", 8, null, es).raw, "25000");
});

test("sin ceros de mas ni montos gigantes", () => {
  assert.equal(parseAmountInput("0005", 4, "5", es).raw, "5");
  assert.equal(parseAmountInput("123456789012", 12, "2", es).raw, "1234567890");
});
