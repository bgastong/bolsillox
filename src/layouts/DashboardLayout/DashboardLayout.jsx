import "./DashboardLayouts.css";
import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "../../components/Sidebar/Sidebar";
import Navbar from "../../components/Navbar/Navbar";

function DashboardLayout({ children }) {
  return (
    <SidebarProvider className="dashboard-shell-wrapper">
      <AppSidebar />

      <main className="dashboard-shell">
        <Navbar />
        {children}
      </main>
    </SidebarProvider>
  );
}

export default DashboardLayout;
