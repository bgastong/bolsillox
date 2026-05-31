import { useLanguage } from "../../hooks/useLanguage";
import { useTheme } from "../../hooks/useTheme";
import "./DashboardLayouts.css";

function DashboardLayout() {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="dashboard-layout">
      <header className="dashboard-layout-header">
        <h1>{t("appName")}</h1>
      </header>

      <div className="dashboard-layout-actions">
        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
        >
          <option value="es">{t("spanish")}</option>
          <option value="en">{t("english")}</option>
        </select>

        <button type="button" onClick={toggleTheme}>
          {theme === "light" ? t("darkTheme") : t("lightTheme")}
        </button>
      </div>
    </div>
  );
}

export default DashboardLayout;
