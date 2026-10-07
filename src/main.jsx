import React from "react";
import ReactDOM from "react-dom/client";
import { inject } from "@vercel/analytics";
import App from "./App.jsx";
import AppProviders from "./context/AppProviders.jsx";
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary.jsx";
import { installErrorReporting } from "./lib/errorReporting";
import "./index.css";

installErrorReporting();

// Visitas con Vercel Web Analytics: sin cookies y sin datos personales.
// Solo en el build de produccion (en desarrollo no se cuenta nada).
if (import.meta.env.PROD) inject({ mode: "production" });

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProviders>
        <App />
      </AppProviders>
    </ErrorBoundary>
  </React.StrictMode>,
);
