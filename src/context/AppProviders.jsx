import { LanguageProvider } from "./LanguageContext";
import { themeProvider } from "./ThemeContext";

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
      <themeProvider>{children}</themeProvider>
    </LanguageProvider>
  );
}

export default AppProviders;
