import "./App.css";
import SummaryCards from "./components/Cards/SummaryCards/SummaryCards";
import DashboardLayout from "./layouts/DashboardLayout/DashboardLayout";

function App() {
  return (
    <DashboardLayout>
      <SummaryCards />
    </DashboardLayout>
  );
}

export default App;
