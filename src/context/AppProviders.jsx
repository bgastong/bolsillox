import { LanguageProvider } from "./LanguageContext";

/*
Utilizamos este context para no ensuciar main de muchos providers.
En ves de poner muchos, utilizamos uno solo.
<AppProviders>
    <App />
</AppProviders>
Toda al app puede usar los idiomas
*/

function AppProviders({ children }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}

export default AppProviders;
