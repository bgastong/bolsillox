import "./DashboardLayouts.css";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { MovementsProvider } from "@/context/MovementsContext";
import { useLanguage } from "@/hooks/useLanguage";
import AppSidebar from "../../components/Sidebar/Sidebar";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import MobileNav from "../../components/MobileNav/MobileNav";

function DashboardLayout({ children }) {
  const { t } = useLanguage();

  return (
    <MovementsProvider>
      <SidebarProvider className="dashboard-shell-wrapper">
        {/* Accesibilidad: saltar directo al contenido con el teclado */}
        <a href="#main-content" className="skip-link">
          {t("skipToContent")}
        </a>

        <AppSidebar />

        <SidebarInset className="dashboard-shell bg-transparent">
          <Navbar />
          <div id="main-content" tabIndex={-1} className="dashboard-content">
            {children}
          </div>
          <Footer />
        </SidebarInset>

        <MobileNav />
      </SidebarProvider>
    </MovementsProvider>
  );
}

export default DashboardLayout;
