import { LanguageProvider } from "./LanguageContext";
import { ToastProvider } from "./ToastContext";
import { SettingsProvider } from "./SettingsContext";

/*
Utilizamos este context para no ensuciar main de muchos providers.
En ves de poner muchos, utilizamos uno solo.
<AppProviders>
    <App />
</AppProviders>
Toda la app puede usar idiomas, ajustes (moneda/cotizacion) y notificaciones.
*/

function AppProviders({ children }) {
  return (
    <LanguageProvider>
      <SettingsProvider>
        <ToastProvider>{children}</ToastProvider>
      </SettingsProvider>
    </LanguageProvider>
  );
}

export default AppProviders;
