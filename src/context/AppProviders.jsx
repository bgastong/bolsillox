import { LanguageProvider } from "./LanguageContext";
import { ThemeProvider } from "./ThemeContext";

/*
Utilizamos este context para no ensuciar main de muchos providers.
En ves de poner muchos, utilizamos uno solo.
<AppProviders>
    <App />
</AppProviders>
Toda al app puede usar el tema y los idiomas
*/

function AppProviders({ children }) {
  return (
    <LanguageProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </LanguageProvider>
  );
}

export default AppProviders;
