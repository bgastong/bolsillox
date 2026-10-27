import assert from "node:assert/strict";
import { test } from "node:test";
import { splitEqually, splitErrors, splitPeople } from "./split.js";

test("partes iguales: lo que sobra del redondeo queda en quien pago", () => {
  assert.deepEqual(splitEqually(100, 2), { share: 33.33, mine: 33.34 });
  assert.deepEqual(splitEqually(90000, 2), { share: 30000, mine: 30000 });
  assert.deepEqual(splitEqually(0, 2), { share: 0, mine: 0 });
});

test("arma las partes de cada persona", () => {
  const people = [
    { person: "Ana", amount: "10" },
    { person: "Leo", amount: "25" },
  ];
  assert.deepEqual(splitPeople(people, "equal", 90), [
    { person: "Ana", amount: 30 },
    { person: "Leo", amount: 30 },
  ]);
  assert.deepEqual(splitPeople(people, "custom", 90), people);
});

test("ubica los errores en la fila de cada persona", () => {
  const issues = [
    { path: ["split", "people", 1, "person"], message: "errorPersonRequired" },
    { path: ["split"], message: "errorSplitTooLarge" },
    { path: ["title"], message: "errorTitleRequired" },
  ];
  assert.deepEqual(splitErrors(issues), { "person-1": "errorPersonRequired", form: "errorSplitTooLarge" });
});
