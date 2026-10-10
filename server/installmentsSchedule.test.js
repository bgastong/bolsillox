import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { installmentsSchedule } from "../src/lib/installments.js";

const plan = (overrides) => ({
  active: true,
  type: "expense",
  currency: "ARS",
  amount: 1000,
  nextDate: "2026-11-10",
  nextInstallment: 1,
  installmentsTotal: 1,
  ...overrides,
});

describe("cuotas por mes", () => {
  test("suma por mes desde la proxima cuota hasta la ultima", () => {
    const { months, convertible } = installmentsSchedule(
      [
        plan({ title: "TV", amount: 50000, nextInstallment: 11, installmentsTotal: 12 }),
        plan({ title: "Heladera", amount: 30000, nextDate: "2026-12-05", nextInstallment: 3, installmentsTotal: 4 }),
        plan({ title: "Pasaje", amount: 20000 }),
      ],
      "ARS",
      null,
    );
    assert.equal(convertible, true);
    assert.deepEqual(months, [
      { month: "2026-11", amount: 70000, count: 2 },
      { month: "2026-12", amount: 80000, count: 2 },
      { month: "2027-01", amount: 30000, count: 1 },
    ]);
  });

  test("ignora pausadas, terminadas e ingresos; convierte dolares", () => {
    const { months } = installmentsSchedule(
      [
        plan({ active: false }),
        plan({ nextDate: null }),
        plan({ type: "income" }),
        plan({ currency: "USD", amount: 10 }),
      ],
      "ARS",
      1000,
    );
    assert.deepEqual(months, [{ month: "2026-11", amount: 10000, count: 1 }]);
  });

  test("sin cotizacion avisa que no pudo convertir", () => {
    const { months, convertible } = installmentsSchedule([plan({ currency: "USD" })], "ARS", null);
    assert.equal(convertible, false);
    assert.deepEqual(months, []);
  });
});
