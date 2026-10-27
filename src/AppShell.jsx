import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout/DashboardLayout";
import { SettingsProvider } from "./context/SettingsContext";
import { CategoriesProvider } from "./context/CategoriesContext";
import { AppearanceProvider } from "./context/AppearanceContext";
import ServiceWorker from "./components/Pwa/ServiceWorker";
import { Skeleton } from "@/components/ui/skeleton";
import { whenIdle } from "@/lib/idle";

/*
La app con sesion iniciada: menu, buscador, barra del celular y pantallas.
Va en un archivo aparte que se baja recien cuando hay sesion (o, en el login,
cuando el navegador esta libre): quien entra a la pagina de inicio no lo descarga.
*/

// Cada pagina se carga bajo demanda (Chart.js solo se baja en el dashboard)
// y, una vez abierta la app, el resto se precarga para que navegar sea instantaneo.
const pages = {
  dashboard: () => import("./pages/Dashboard"),
  history: () => import("./pages/History"),
  recurring: () => import("./pages/Recurring"),
  debts: () => import("./pages/Debts"),
  budgets: () => import("./pages/Budgets"),
  goals: () => import("./pages/Goals"),
  settings: () => import("./pages/Settings"),
};
const Dashboard = lazy(pages.dashboard);
const History = lazy(pages.history);
const Recurring = lazy(pages.recurring);
const Debts = lazy(pages.debts);
const Budgets = lazy(pages.budgets);
const Goals = lazy(pages.goals);
const Settings = lazy(pages.settings);
const NotFound = lazy(() => import("./pages/NotFound"));

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

export default function AppShell() {
  useEffect(prefetchPages, []);

  return (
    <SettingsProvider>
      <ServiceWorker />
      <AppearanceProvider>
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
              <Route path="/goals" element={<Goals />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </DashboardLayout>
      </CategoriesProvider>
      </AppearanceProvider>
    </SettingsProvider>
  );
}
