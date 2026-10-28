/*
Logica del campo de monto con separador de miles (ver components/ui/amount-input.jsx).
El valor "crudo" es el que usan los formularios: "1234.5" (punto decimal, sin
miles). Lo que se ve depende del idioma: "1.234,5" en español, "1,234.5" en ingles.
*/

const MAX_INTEGER_DIGITS = 10;
const MAX_DECIMALS = 2;

// Separadores del idioma: { group: ".", decimal: "," } en es-AR.
export function separatorsFor(locale) {
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  return {
    group: parts.find((part) => part.type === "group")?.value ?? ",",
    decimal: parts.find((part) => part.type === "decimal")?.value ?? ".",
  };
}

// "1234.5" -> "1.234,5". Respeta un decimal recien escrito ("12." -> "12,").
export function formatAmount(raw, { group, decimal }) {
  if (raw === "" || raw === null || raw === undefined) return "";
  const [integer, decimals] = String(raw).split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, group);
  return decimals === undefined ? grouped : `${grouped}${decimal}${decimals}`;
}

/*
Si se borro un separador de miles (que se pone solo), en realidad se quiso
borrar el digito de al lado: con Backspace, el de antes; con Supr, el de despues.
Si no, el punto volveria a aparecer y pareceria que la tecla no anda.
- previous: el texto antes de borrar. text y caret: como quedo.
*/
export function fixSeparatorDelete(previous, text, caret, inputType, { group }) {
  const removed = previous.length === text.length + 1 && previous.slice(0, caret) + previous.slice(caret + 1) === text;
  if (!removed || previous[caret] !== group) return { text, caret };
  if (inputType === "deleteContentForward") return { text: text.slice(0, caret) + text.slice(caret + 1), caret };
  if (caret === 0) return { text, caret };
  return { text: text.slice(0, caret - 1) + text.slice(caret), caret: caret - 1 };
}

/*
Lo que escribio la persona -> valor crudo y cuantos "caracteres de numero"
(digitos y la coma decimal) quedan antes del cursor, para volver a ponerlo ahi.
- text: lo que quedo en el campo. caret: posicion del cursor.
- typed: la tecla que se apreto (InputEvent.data), o null.
- inputType: el tipo de cambio (InputEvent.inputType): "insertText",
  "insertFromPaste", "deleteContentBackward"...
Tocar "." o "," es siempre la coma decimal (los miles se ponen solos).
*/
export function parseAmountInput(text, caret, typed, { group, decimal }, inputType = null) {
  const chars = [...text];
  let decimalAt = -1;
  if (typed === "." || typed === ",") {
    decimalAt = caret - 1;
  } else if (inputType === "insertFromPaste" || inputType === "insertFromDrop" || (!inputType && !typed)) {
    // Pegado: "1234.56" (sin miles y con punto) tambien es decimal. Al borrar
    // no se aplica: "1.234" que queda en "1.23" sigue siendo mil doscientos...
    if (group === "." && !text.includes(decimal) && /^\d*\.\d{1,2}$/.test(text)) decimalAt = text.lastIndexOf(".");
  }

  let raw = "";
  let before = 0;
  let hasDecimal = false;
  chars.forEach((char, index) => {
    let kept = null;
    if (/\d/.test(char)) kept = char;
    else if ((index === decimalAt || char === decimal) && !hasDecimal) {
      kept = ".";
      hasDecimal = true;
    }
    if (kept !== null) {
      raw += kept;
      if (index < caret) before++;
    }
  });

  // Limites: hasta 10 digitos enteros y 2 decimales; sin ceros de mas adelante.
  let [integer, decimals] = raw.split(".");
  const leading = integer.length - (integer.replace(/^0+(?=\d)/, "").length);
  integer = integer.replace(/^0+(?=\d)/, "");
  before = Math.max(0, before - leading);
  if (integer.length > MAX_INTEGER_DIGITS) integer = integer.slice(0, MAX_INTEGER_DIGITS);
  if (decimals !== undefined) {
    decimals = decimals.slice(0, MAX_DECIMALS);
    if (integer === "") {
      integer = "0";
      before++;
    }
  }
  const result = decimals === undefined ? integer : `${integer}.${decimals}`;
  return { raw: result, before: Math.min(before, result.length) };
}

// Posicion del cursor en el texto formateado despues de `before` caracteres de numero.
export function caretAfter(formatted, before, { decimal }) {
  if (before <= 0) return 0;
  let count = 0;
  for (let index = 0; index < formatted.length; index++) {
    if (/\d/.test(formatted[index]) || formatted[index] === decimal) count++;
    if (count === before) return index + 1;
  }
  return formatted.length;
}
