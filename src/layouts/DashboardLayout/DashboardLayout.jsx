import "./DashboardLayouts.css";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "../../components/Sidebar/Sidebar";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";

function DashboardLayout({ children }) {
  return (
    <SidebarProvider className="dashboard-shell-wrapper">
      <AppSidebar />

      <SidebarInset className="dashboard-shell bg-transparent">
        <Navbar />
        <div className="dashboard-content">{children}</div>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  );
}

export default DashboardLayout;
