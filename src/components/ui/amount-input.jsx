import { useLayoutEffect, useMemo, useRef } from "react";
import { caretAfter, fixSeparatorDelete, formatAmount, parseAmountInput, separatorsFor } from "@/lib/amountInput";
import { useLanguage } from "@/hooks/useLanguage";
import { Input } from "./input";

/*
Campo de monto que pone los separadores de miles mientras se escribe:
"1000" se ve "1.000" (en ingles, "1,000"). Se usa como un Input comun:
value es el monto "crudo" ("1234.5") y onChange recibe { target: { value } }
con ese mismo formato, asi los formularios no cambian.
Tocar "." o "," pone la coma decimal; el cursor no salta al reformatear.
*/
function AmountInput({ value, onChange, onValueChange, ...props }) {
  const { locale } = useLanguage();
  const separators = useMemo(() => separatorsFor(locale), [locale]);
  const inputRef = useRef(null);
  // Donde dejar el cursor despues del proximo render (caracteres de numero antes).
  const pendingCaret = useRef(null);
  const text = formatAmount(value ?? "", separators);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (pendingCaret.current === null || !input || document.activeElement !== input) return;
    const position = caretAfter(text, pendingCaret.current, separators);
    pendingCaret.current = null;
    input.setSelectionRange(position, position);
  });

  function handleChange(event) {
    const inputType = event.nativeEvent?.inputType ?? null;
    // Borrar un punto de miles borra el digito de al lado (ver fixSeparatorDelete).
    const edited = inputType?.startsWith("delete")
      ? fixSeparatorDelete(text, event.target.value, event.target.selectionStart ?? event.target.value.length, inputType, separators)
      : { text: event.target.value, caret: event.target.selectionStart ?? event.target.value.length };
    const { raw, before } = parseAmountInput(edited.text, edited.caret, event.nativeEvent?.data ?? null, separators, inputType);
    pendingCaret.current = before;
    onChange?.({ target: { value: raw } });
    onValueChange?.(raw);
    // Si el valor no cambio (por ejemplo, se escribio una letra), igual se
    // vuelve a mostrar el texto formateado.
    if (raw === (value ?? "")) {
      event.target.value = text;
      const position = caretAfter(text, before, separators);
      event.target.setSelectionRange(position, position);
      pendingCaret.current = null;
    }
  }

  return (
    <Input
      {...props}
      ref={inputRef}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={text}
      onChange={handleChange}
    />
  );
}

export { AmountInput };
