import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import DashboardLayout from "./layouts/DashboardLayout/DashboardLayout";
import History from "./pages/History";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <BrowserRouter>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </DashboardLayout>
    </BrowserRouter>
  );
}

export default App;
