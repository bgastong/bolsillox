import { useCallback, useEffect, useMemo, useState } from "react";
import {
  defaultLanguage,
  localeByLanguage,
  translations,
} from "../i18n/translations";
import { LanguageContext } from "./LanguageContextValue";

const STORAGE_KEY = "bolsillox.language";

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
provider: provee datos de otro componente
children: todos los datos dentro del provider
t(key, vars): traduce una clave y reemplaza {{variables}}
*/
export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

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
      const text = translations[language]?.[key] ?? key;
      if (!vars) return text;
      return text.replace(/\{\{(\w+)\}\}/g, (match, name) =>
        name in vars ? String(vars[name]) : match,
      );
    },
    [language],
  );

  const value = useMemo(
    () => ({ language, locale: localeByLanguage[language], setLanguage, t }),
    [language, setLanguage, t],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}
