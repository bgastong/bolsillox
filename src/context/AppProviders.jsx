import { LanguageProvider } from "./LanguageContext";
import { ToastProvider } from "./ToastContext";
import { AuthProvider } from "./AuthContext";

/*
Providers globales en un solo lugar:
<AppProviders>
    <App />
</AppProviders>
Toda la app puede usar idiomas, notificaciones y la sesion del usuario.
Los ajustes (moneda/cotizacion) necesitan sesion: su provider esta en App.
*/

function AppProviders({ children }) {
  return (
    <LanguageProvider>
      <ToastProvider>
        <AuthProvider>{children}</AuthProvider>
      </ToastProvider>
    </LanguageProvider>
  );
}

export default AppProviders;
