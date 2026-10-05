import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout/DashboardLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { whenIdle } from "@/lib/idle";

// Cada pagina se carga bajo demanda (Chart.js solo se baja en el dashboard)
// y, una vez abierta la app, el resto se precarga para que navegar sea instantaneo.
const pages = {
  dashboard: () => import("./pages/Dashboard"),
  history: () => import("./pages/History"),
  recurring: () => import("./pages/Recurring"),
  budgets: () => import("./pages/Budgets"),
  settings: () => import("./pages/Settings"),
};
const Dashboard = lazy(pages.dashboard);
const History = lazy(pages.history);
const Recurring = lazy(pages.recurring);
const Budgets = lazy(pages.budgets);
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

function App() {
  useEffect(prefetchPages, []);

  return (
    <BrowserRouter>
      <DashboardLayout>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/history" element={<History />} />
            <Route path="/recurring" element={<Recurring />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </DashboardLayout>
    </BrowserRouter>
  );
}

export default App;
