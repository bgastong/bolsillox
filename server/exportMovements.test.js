import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { movementsTable, toCSV, toXLSX } from "../src/lib/exportMovements.js";

const t = (key) => ({ expense: "Gasto", income: "Ingreso" })[key] ?? key;
const movements = [
  { date: "2026-10-05", type: "expense", title: 'Super "Día"', category: "food", paymentMethod: "debit", currency: "ARS", amount: 1500.5, note: "con, coma" },
  { date: "2026-10-01", type: "income", title: "=HYPERLINK(1)", category: "salary", paymentMethod: "transfer", currency: "USD", amount: 1000, note: "" },
];
const table = () =>
  movementsTable(movements, { t, categoryName: (key) => `cat:${key}`, methodName: (key) => `pm:${key}` });

// Lee un zip "store" y devuelve { nombre: texto }.
function unzip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const files = {};
  let offset = 0;
  while (view.getUint32(offset, true) === 0x04034b50) {
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const name = new TextDecoder().decode(bytes.subarray(offset + 30, offset + 30 + nameLength));
    const start = offset + 30 + nameLength;
    files[name] = new TextDecoder().decode(bytes.subarray(start, start + size));
    offset = start + size;
  }
  return files;
}

describe("exportar movimientos", () => {
  test("CSV: BOM, comillas, gastos en negativo y sin formulas", () => {
    const { columns, rows } = table();
    const csv = toCSV(columns, rows);
    assert.ok(csv.startsWith("﻿date,type,titleLabel"));
    const lines = csv.slice(1).trim().split("\r\n");
    assert.equal(lines[1], '2026-10-05,Gasto,"Super ""Día""",cat:food,pm:debit,ARS,-1500.5,"con, coma"');
    assert.equal(lines[2], "2026-10-01,Ingreso,'=HYPERLINK(1),cat:salary,pm:transfer,USD,1000,");
  });

  test("XLSX: zip valido con fechas y montos como numeros", () => {
    const { columns, rows } = table();
    const files = unzip(toXLSX(columns, rows, "Movimientos"));
    assert.deepEqual(Object.keys(files).sort(), [
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/workbook.xml",
      "xl/worksheets/sheet1.xml",
    ]);
    const sheet = files["xl/worksheets/sheet1.xml"];
    // 5/10/2026 = 46300 dias desde 30/12/1899
    assert.match(sheet, /<c r="A2" s="2"><v>46300<\/v><\/c>/);
    assert.match(sheet, /<c r="G2" s="3"><v>-1500.5<\/v><\/c>/);
    assert.match(sheet, /Super &quot;Día&quot;/);
    assert.match(sheet, /'=HYPERLINK\(1\)/);
    assert.match(sheet, /<autoFilter ref="A1:H3"\/>/);
    assert.match(files["xl/workbook.xml"], /'Movimientos'!\$A\$1:\$H\$3/);
  });
});
