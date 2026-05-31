import { createContext, useContext, useState } from "react";
import { defaultLanguage, translations } from "../i18n/translations";
/*
provider: provee datos de otro componente
children: todos los datos dentro del provider
*/
const LanguageContext = createContext(null);

export function LanguageProvider({ children }) { 
  const [language, setLanguage] = useState(defaultLanguage); 

  function t(key) {
    return translations[translations][key] || key;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}
