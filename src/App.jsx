import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout/DashboardLayout";
import Splash from "./components/Brand/Splash";
import { BrandMark } from "./components/Brand/BrandIcons";
import { SettingsProvider } from "./context/SettingsContext";
import { CategoriesProvider } from "./context/CategoriesContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { whenIdle } from "@/lib/idle";

// Cada pagina se carga bajo demanda (Chart.js solo se baja en el dashboard)
// y, una vez abierta la app, el resto se precarga para que navegar sea instantaneo.
const pages = {
  dashboard: () => import("./pages/Dashboard"),
  history: () => import("./pages/History"),
  recurring: () => import("./pages/Recurring"),
  debts: () => import("./pages/Debts"),
  budgets: () => import("./pages/Budgets"),
  settings: () => import("./pages/Settings"),
};
const Dashboard = lazy(pages.dashboard);
const History = lazy(pages.history);
const Recurring = lazy(pages.recurring);
const Debts = lazy(pages.debts);
const Budgets = lazy(pages.budgets);
const Settings = lazy(pages.settings);
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const Landing = lazy(() => import("./pages/Landing"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Register = lazy(() => import("./pages/Register"));

function prefetchPages() {
  // Con ahorro de datos activado no se precarga nada.
  if (navigator.connection?.saveData) return undefined;
  return whenIdle(() => Object.values(pages).forEach((load) => load()), 4000);
}

function PageFallback() {
  return (
    <div className="grid gap-4" aria-busy="true">
      <Skeleton className="h-10 w-56 rounded-lg" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

// Despues de este tiempo se explica por que tarda (servidor gratis "dormido").
const SLOW_LOADING_MS = 4000;

// Mientras se averigua si hay sesion.
function FullScreenLoader() {
  const { t } = useLanguage();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_LOADING_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center"
      role="status"
    >
      <BrandMark className="size-12 animate-pulse" />
      <p className="m-0 text-sm text-muted-foreground">{t("loading")}</p>
      {slow && (
        <p className="page-enter m-0 max-w-xs text-sm text-muted-foreground">{t("serverWakingUp")}</p>
      )}
    </div>
  );
}

// Pantallas de la app: solo con sesion iniciada.
function RequireAuth({ children }) {
  const { status, loggedOut } = useAuth();
  const location = useLocation();
  if (status === "loading") return <FullScreenLoader />;
  if (status === "guest") {
    // Sin sesion, la raiz muestra la pagina de inicio (con botones para entrar).
    if (location.pathname === "/") {
      return (
        <Suspense fallback={<FullScreenLoader />}>
          <Landing />
        </Suspense>
      );
    }
    // Si la sesion vencio, despues del login vuelve a la pantalla donde estaba.
    return <Navigate to="/login" replace state={loggedOut ? undefined : { from: location }} />;
  }
  return children;
}

// Login y registro: si ya hay sesion, a donde queria ir (o al inicio).
function GuestOnly({ children }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "loading") return <FullScreenLoader />;
  if (status === "authenticated") {
    const from = location.state?.from;
    return <Navigate to={from ? `${from.pathname}${from.search}` : "/"} replace />;
  }
  return <Suspense fallback={<FullScreenLoader />}>{children}</Suspense>;
}

function AppShell() {
  useEffect(prefetchPages, []);

  return (
    <SettingsProvider>
      <CategoriesProvider>
        <DashboardLayout>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/history" element={<History />} />
              <Route path="/recurring" element={<Recurring />} />
              <Route path="/debts" element={<Debts />} />
                {/* Cuotas ahora vive en Deudas > Debo */}
                <Route path="/installments" element={<Navigate to="/debts" replace />} />
              <Route path="/budgets" element={<Budgets />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </DashboardLayout>
      </CategoriesProvider>
    </SettingsProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Splash />
      <Routes>
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
        <Route path="/verificar" element={<GuestOnly><VerifyEmail /></GuestOnly>} />
        <Route path="/recuperar" element={<GuestOnly><ForgotPassword /></GuestOnly>} />
        {/* Paginas legales: con o sin sesion */}
        <Route path="/terminos" element={<Suspense fallback={<FullScreenLoader />}><Terms /></Suspense>} />
        <Route path="/privacidad" element={<Suspense fallback={<FullScreenLoader />}><Privacy /></Suspense>} />
        <Route path="*" element={<RequireAuth><AppShell /></RequireAuth>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
