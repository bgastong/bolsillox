/*
Exporta movimientos a CSV o a Excel (.xlsx) en el navegador, sin librerias:
el .xlsx es un zip (sin compresion) con unos pocos XML.

columns: [{ header, type: "text" | "date" | "amount" }]
rows: arrays con un valor por columna (las fechas en "YYYY-MM-DD").
*/

// Una celda de texto que arranca con = + - @ la toman como formula Excel y
// Google Sheets: se le antepone un apostrofo (los montos son numeros, no texto).
function safeText(value) {
  const text = String(value ?? "");
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function csvField(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

// CSV con coma y punto decimal; el BOM hace que Excel lea bien los acentos.
export function toCSV(columns, rows) {
  const lines = [columns.map((column) => csvField(column.header))];
  for (const row of rows) {
    lines.push(
      row.map((value, index) =>
        csvField(columns[index].type === "text" ? safeText(value) : value),
      ),
    );
  }
  return `\uFEFF${lines.map((line) => line.join(",")).join("\r\n")}\r\n`;
}

// ---------- XLSX ----------

function xmlEscape(text) {
  return String(text)
    // XML no admite caracteres de control (salvo tab y saltos de linea).
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// "A", "B", ... "Z", "AA"...
function columnName(index) {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  }
  return name;
}

// Dias desde el 30/12/1899: asi guarda Excel las fechas.
function excelDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return (Date.UTC(year, month - 1, day) - Date.UTC(1899, 11, 30)) / 86_400_000;
}

// Estilos (indices de cellXfs en styles.xml).
const STYLE = { header: 1, date: 2, amount: 3 };

function cellXml(ref, value, type) {
  if (value === null || value === undefined || value === "") return "";
  if (type === "date") return `<c r="${ref}" s="${STYLE.date}"><v>${excelDate(value)}</v></c>`;
  if (type === "amount") return `<c r="${ref}" s="${STYLE.amount}"><v>${Number(value)}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
}

function sheetXml(columns, rows) {
  const lastColumn = columnName(columns.length - 1);
  const lastRow = rows.length + 1;
  const header = columns
    .map(
      (column, index) =>
        `<c r="${columnName(index)}1" t="inlineStr" s="${STYLE.header}"><is><t>${xmlEscape(column.header)}</t></is></c>`,
    )
    .join("");
  const body = rows
    .map((row, rowIndex) => {
      const r = rowIndex + 2;
      const cells = row.map((value, index) => cellXml(`${columnName(index)}${r}`, value, columns[index].type));
      return `<row r="${r}">${cells.join("")}</row>`;
    })
    .join("");
  const widths = columns
    .map((column, index) => `<col min="${index + 1}" max="${index + 1}" width="${column.width ?? 14}" customWidth="1"/>`)
    .join("");
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    // Encabezado fijo al bajar
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    `<cols>${widths}</cols>` +
    `<sheetData><row r="1">${header}</row>${body}</sheetData>` +
    `<autoFilter ref="A1:${lastColumn}${lastRow}"/>` +
    "</worksheet>"
  );
}

const STYLES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="#,##0.00"/></numFmts>' +
  '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
  '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="4">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  "</cellXfs>" +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  "</styleSheet>";

function workbookXml(sheetName, filterRange) {
  const name = xmlEscape(sheetName.slice(0, 31).replace(/[[\]:*?/\\]/g, " "));
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets>` +
    // Rango del filtro del encabezado (Excel lo espera junto al autoFilter).
    `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${name.replaceAll("'", "''")}'!${filterRange}</definedName></definedNames>` +
    "</workbook>"
  );
}

const CONTENT_TYPES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
  "</Types>";

const ROOT_RELS_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  "</Relationships>";

const WORKBOOK_RELS_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  "</Relationships>";

// ---------- ZIP (metodo "store", sin compresion) ----------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// Fecha fija (1/1/1980, la minima de zip): el contenido no depende del reloj.
const DOS_DATE = 0x21;

export function zipStore(files) {
  const encoder = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = typeof file.data === "string" ? encoder.encode(file.data) : file.data;
    const crc = crc32(data);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true); // version
    local.setUint16(6, 0x0800, true); // nombres en UTF-8
    local.setUint16(8, 0, true); // store
    local.setUint16(10, 0, true);
    local.setUint16(12, DOS_DATE, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true);
    chunks.push(new Uint8Array(local.buffer), name, data);

    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(8, 0x0800, true);
    entry.setUint16(10, 0, true);
    entry.setUint16(12, 0, true);
    entry.setUint16(14, DOS_DATE, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, data.length, true);
    entry.setUint32(24, data.length, true);
    entry.setUint16(28, name.length, true);
    entry.setUint32(42, offset, true);
    central.push(new Uint8Array(entry.buffer), name);

    offset += 30 + name.length + data.length;
  }

  const centralSize = central.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);

  const parts = [...chunks, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let position = 0;
  for (const part of parts) {
    out.set(part, position);
    position += part.length;
  }
  return out;
}

export function toXLSX(columns, rows, sheetName = "Movimientos") {
  const safeRows = rows.map((row) =>
    row.map((value, index) => (columns[index].type === "text" ? safeText(value) : value)),
  );
  return zipStore([
    { name: "[Content_Types].xml", data: CONTENT_TYPES_XML },
    { name: "_rels/.rels", data: ROOT_RELS_XML },
    {
      name: "xl/workbook.xml",
      data: workbookXml(sheetName, `$A$1:$${columnName(columns.length - 1)}$${rows.length + 1}`),
    },
    { name: "xl/_rels/workbook.xml.rels", data: WORKBOOK_RELS_XML },
    { name: "xl/styles.xml", data: STYLES_XML },
    { name: "xl/worksheets/sheet1.xml", data: sheetXml(columns, safeRows) },
  ]);
}

// ---------- Movimientos ----------

/*
Arma columnas y filas con los textos en el idioma elegido.
categoryName(key) y methodName(key) devuelven el nombre visible.
Los gastos van en negativo, asi una suma da el neto.
*/
export function movementsTable(movements, { t, categoryName, methodName }) {
  const columns = [
    { header: t("date"), type: "date", width: 12 },
    { header: t("type"), type: "text", width: 10 },
    { header: t("titleLabel"), type: "text", width: 32 },
    { header: t("category"), type: "text", width: 18 },
    { header: t("method"), type: "text", width: 16 },
    { header: t("currency"), type: "text", width: 9 },
    { header: t("amount"), type: "amount", width: 14 },
    { header: t("note"), type: "text", width: 40 },
  ];
  const rows = movements.map((movement) => [
    movement.date,
    t(movement.type === "expense" ? "expense" : "income"),
    movement.title,
    categoryName(movement.category),
    methodName(movement.paymentMethod),
    movement.currency,
    movement.type === "expense" ? -movement.amount : movement.amount,
    movement.note ?? "",
  ]);
  return { columns, rows };
}

export const EXPORT_FORMATS = {
  xlsx: {
    extension: "xlsx",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    build: toXLSX,
  },
  csv: { extension: "csv", mime: "text/csv;charset=utf-8", build: toCSV },
};

// Descarga un archivo generado en el navegador.
export function downloadFile(content, filename, mime) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
