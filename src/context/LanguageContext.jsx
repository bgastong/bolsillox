import { useState } from "react";
import { defaultLanguage, translations } from "../i18n/translations";
import { LanguageContext } from "./LanguageContextValue";
/*
provider: provee datos de otro componente
children: todos los datos dentro del provider
*/
export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(defaultLanguage);

  function t(key) {
    return translations[language]?.[key] || key;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
