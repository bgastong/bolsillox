import { useContext } from "react";
import { LanguageContext } from "../context/LanguageContextValue";

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return context;
}
