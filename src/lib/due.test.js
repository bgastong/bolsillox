import assert from "node:assert/strict";
import { test } from "node:test";
import { daysUntil, dueTone } from "./due.js";

test("cuenta los días hasta un vencimiento, también entre meses y años", () => {
  assert.equal(daysUntil("2026-10-22", "2026-10-21"), 1);
  assert.equal(daysUntil("2026-11-02", "2026-10-21"), 12);
  assert.equal(daysUntil("2027-01-01", "2026-12-31"), 1);
  assert.equal(daysUntil("2026-10-18", "2026-10-21"), -3);
  assert.equal(daysUntil("2026-10-21", "2026-10-21"), 0);
});

test("solo marca lo que vence en 2 días o menos, y en rojo lo vencido", () => {
  assert.deepEqual([-1, 0, 1, 2, 3, 30].map(dueTone), ["overdue", "soon", "soon", "soon", "later", "later"]);
});
