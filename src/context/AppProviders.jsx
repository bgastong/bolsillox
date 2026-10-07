import { LanguageProvider } from "./LanguageContext";
import { ToastProvider } from "./ToastContext";
import { AuthProvider } from "./AuthContext";
import { ThemeProvider } from "./ThemeContext";

/*
Providers globales en un solo lugar:
<AppProviders>
    <App />
</AppProviders>
Toda la app puede usar el tema, idiomas, notificaciones y la sesion del usuario.
Los ajustes (moneda/cotizacion) necesitan sesion: su provider esta en App.
*/

function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default AppProviders;
