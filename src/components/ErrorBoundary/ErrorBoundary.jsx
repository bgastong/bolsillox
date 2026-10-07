import { Component } from "react";
import { reportError } from "@/lib/errorReporting";

// Va por fuera de los providers (pueden ser ellos los que fallaron): el texto
// sale del idioma de la pagina y no del contexto de idioma.
const COPY = {
  es: {
    title: "Algo salió mal",
    text: "Tuvimos un problema al mostrar esta pantalla. Ya nos llegó el aviso. Tus datos están a salvo.",
    reload: "Recargar la página",
    home: "Ir al inicio",
  },
  en: {
    title: "Something went wrong",
    text: "We had a problem showing this screen. We've been notified. Your data is safe.",
    reload: "Reload the page",
    home: "Go to the home page",
  },
};

/*
Si un componente falla al dibujarse, en vez de quedar la pantalla en blanco
muestra un mensaje con la opcion de recargar, y avisa el error.
*/
class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    reportError(error, info?.componentStack ?? "");
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const copy = COPY[document.documentElement.lang] ?? COPY.es;
    return (
      <main className="flex min-h-svh items-center justify-center bg-background px-4 text-foreground">
        <div role="alert" className="grid w-full max-w-sm gap-4 rounded-3xl border border-fg/10 bg-card p-6 text-center sm:p-8">
          <h1 className="m-0 text-xl font-medium tracking-[-0.02em]">{copy.title}</h1>
          <p className="m-0 text-sm leading-relaxed text-muted-foreground">{copy.text}</p>
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-11 rounded-xl bg-primary text-sm font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
            >
              {copy.reload}
            </button>
            <a
              href="/"
              className="flex h-11 items-center justify-center rounded-xl border border-fg/12 text-sm font-medium outline-none hover:bg-fg/[0.05] focus-visible:ring-2 focus-visible:ring-ring"
            >
              {copy.home}
            </a>
          </div>
        </div>
      </main>
    );
  }
}

export default ErrorBoundary;
