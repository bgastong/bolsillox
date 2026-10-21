import { useCallback, useEffect, useMemo, useState } from "react";
import {
  defaultLanguage,
  localeByLanguage,
  translations,
} from "../i18n/translations";
import { setAmountsHidden } from "../lib/format";
import { LanguageContext } from "./LanguageContextValue";

const STORAGE_KEY = "bolsillox.language";
// Modo privado (montos ocultos): se recuerda en este dispositivo.
const HIDE_AMOUNTS_KEY = "bolsillox.hideAmounts";

function getInitialHideAmounts() {
  try {
    return localStorage.getItem(HIDE_AMOUNTS_KEY) === "1";
  } catch {
    return false;
  }
}

function getInitialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && translations[saved]) return saved;
  } catch {
    // localStorage puede no estar disponible (modo privado, etc.)
  }
  return defaultLanguage;
}

/*
Como se muestran textos y numeros: idioma, formato y modo privado.
- t(key, vars): traduce una clave y reemplaza {{variables}}.
- hideAmounts / setHideAmounts: modo privado. Va aca porque todo lo que
  muestra plata ya usa este contexto (por el locale), asi al cambiarlo se
  vuelve a dibujar con los montos tapados o a la vista.
*/
export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);
  const [hideAmounts, setHideAmountsState] = useState(() => {
    const initial = getInitialHideAmounts();
    setAmountsHidden(initial);
    return initial;
  });

  // El formateador se actualiza antes de volver a dibujar.
  const setHideAmounts = useCallback((next) => {
    setAmountsHidden(next);
    setHideAmountsState(next);
    try {
      localStorage.setItem(HIDE_AMOUNTS_KEY, next ? "1" : "0");
    } catch {
      // ignorado
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next) => {
    if (!translations[next]) return;
    setLanguageState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignorado
    }
  }, []);

  const t = useCallback(
    (key, vars) => {
      const dict = translations[language] ?? {};
      // Plural simple: si count === 1 y existe "<clave>_one", se usa esa.
      const singularKey = vars?.count === 1 ? `${key}_one` : null;
      const text = (singularKey && dict[singularKey]) ?? dict[key] ?? key;
      if (!vars) return text;
      return text.replace(/\{\{(\w+)\}\}/g, (match, name) =>
        name in vars ? String(vars[name]) : match,
      );
    },
    [language],
  );

  const value = useMemo(
    () => ({ language, locale: localeByLanguage[language], setLanguage, t, hideAmounts, setHideAmounts }),
    [language, setLanguage, t, hideAmounts, setHideAmounts],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}
