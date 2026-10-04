import { LanguageProvider } from "./LanguageContext";
import { ToastProvider } from "./ToastContext";

/*
Utilizamos este context para no ensuciar main de muchos providers.
En ves de poner muchos, utilizamos uno solo.
<AppProviders>
    <App />
</AppProviders>
Toda al app puede usar los idiomas y las notificaciones.
*/

function AppProviders({ children }) {
  return (
    <LanguageProvider>
      <ToastProvider>{children}</ToastProvider>
    </LanguageProvider>
  );
}

export default AppProviders;
