import assert from "node:assert/strict";
import { test } from "node:test";
import { sliceSizes } from "./pie.js";

const round = (values) => values.map((value) => Math.round(value * 10) / 10);

test("las porciones muy chicas se agrandan hasta el minimo y el total no cambia", () => {
  const sizes = sliceSizes([900, 95, 5]);
  assert.deepEqual(round(sizes), [881.9, 93.1, 25]);
  assert.equal(Math.round(sizes.reduce((sum, value) => sum + value, 0)), 1000);
});

test("si ninguna es chica, quedan igual", () => {
  assert.deepEqual(sliceSizes([60, 40]), [60, 40]);
  assert.deepEqual(sliceSizes([]), []);
});
