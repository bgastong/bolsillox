import "./DashboardLayouts.css";
import { useLocation } from "react-router-dom";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { MovementsProvider } from "@/context/MovementsContext";
import { useLanguage } from "@/hooks/useLanguage";
import CommandPalette from "@/components/CommandPalette/CommandPalette";
import AppSidebar from "../../components/Sidebar/Sidebar";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import MobileNav from "../../components/MobileNav/MobileNav";

function DashboardLayout({ children }) {
  const { t } = useLanguage();
  const { pathname } = useLocation();

  return (
    <MovementsProvider>
      <CommandPalette>
        {/* Luz tenue de fondo */}
        <div className="bg-glow" aria-hidden="true" />
        <SidebarProvider className="dashboard-shell-wrapper">
          {/* Accesibilidad: saltar directo al contenido con el teclado */}
          <a href="#main-content" className="skip-link">
            {t("skipToContent")}
          </a>

          <AppSidebar />

          <SidebarInset className="dashboard-shell bg-transparent">
            <Navbar />
            <div id="main-content" tabIndex={-1} className="dashboard-content">
              {/* La key reinicia la animacion de entrada al cambiar de pantalla */}
              <div key={pathname} className="page-enter">
                {children}
              </div>
            </div>
            <Footer />
          </SidebarInset>

          <MobileNav />
        </SidebarProvider>
      </CommandPalette>
    </MovementsProvider>
  );
}

export default DashboardLayout;
