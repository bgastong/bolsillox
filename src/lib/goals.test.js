import assert from "node:assert/strict";
import { test } from "node:test";
import { monthsUntil } from "./goals.js";

test("meses que quedan para una meta, este incluido", () => {
  assert.equal(monthsUntil("2027-03-15", "2026-10-27"), 6);
  assert.equal(monthsUntil("2026-10-31", "2026-10-27"), 1);
  assert.equal(monthsUntil("2026-10-01", "2026-10-27"), null);
  assert.equal(monthsUntil("", "2026-10-27"), null);
});
