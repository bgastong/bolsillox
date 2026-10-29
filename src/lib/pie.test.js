import assert from "node:assert/strict";
import { test } from "node:test";
import { groupTop, OTHER_KEY, sliceSizes } from "./pie.js";

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

const item = (category, total, previous) => ({ category, total, previous, variation: null });

test("con top, las mas chicas se juntan en Otras con su mes anterior", () => {
  const data = [item("a", 500, 400), item("b", 300, 300), item("c", 100, 50), item("d", 60, 0), item("e", 40, 50)];
  const grouped = groupTop(data, 2);
  assert.deepEqual(grouped.map((entry) => entry.category), ["a", "b", OTHER_KEY]);
  assert.deepEqual(grouped[2], { category: OTHER_KEY, total: 200, previous: 100, variation: 100, count: 3 });
});

test("sin top, o si sobraria una sola, quedan todas", () => {
  const data = [item("a", 5, 0), item("b", 3, 0), item("c", 1, 0)];
  assert.equal(groupTop(data, 0), data);
  assert.equal(groupTop(data, 2), data);
  assert.equal(groupTop([], 5).length, 0);
});

test("Otras sin gasto el mes anterior no tiene variacion", () => {
  const data = [item("a", 5, 1), item("b", 3, 0), item("c", 1, 0)];
  assert.equal(groupTop(data, 1)[1].variation, null);
});
