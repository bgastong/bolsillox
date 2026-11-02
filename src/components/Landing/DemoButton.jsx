import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { PlayIcon } from "lucide-react";
import Wordmark from "@/components/Brand/Wordmark";
import { authErrorKey } from "@/lib/authErrors";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";

const ZOOM_MS = 750;

function prefersReducedMotion() {
  return typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
}

/*
Copia estatica de la vista previa de la portada, en su lugar, y cuanto hay que
moverla y agrandarla para que cubra la pantalla.
*/
function zoomFrom(element) {
  const rect = element?.getBoundingClientRect();
  if (!rect?.width) return null;
  const { innerWidth: width, innerHeight: height } = window;
  return {
    html: element.outerHTML,
    box: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    to: `translate(${width / 2 - (rect.left + rect.width / 2)}px, ${height / 2 - (rect.top + rect.height / 2)}px) scale(${Math.max(width / rect.width, height / rect.height) * 1.08})`,
  };
}

const preloadApp = () => import("@/AppShell");

/*
"Probar sin registrarme": crea una cuenta de prueba con datos de ejemplo y
entra a la app. Al tocarlo, la vista previa de la portada (previewSelector) se
agranda hasta llenar la pantalla mientras se crea la cuenta; despues aparece la
app. Con "reducir movimiento" entra directo.
*/
function DemoButton({ previewSelector = ".landing-preview" }) {
  const { t, language } = useLanguage();
  const { startDemo } = useAuth();
  const [zoom, setZoom] = useState(null); // { from, open: false | true | "closing" }
  const [error, setError] = useState(null);
  const busy = Boolean(zoom);
  const buttonRef = useRef(null);

  // Si la cuenta no se pudo crear, la vista previa vuelve a su lugar y se cierra.
  useEffect(() => {
    if (!zoom || zoom.open !== "closing") return undefined;
    const timer = setTimeout(() => setZoom(null), ZOOM_MS);
    return () => clearTimeout(timer);
  }, [zoom]);

  async function start() {
    if (busy) return;
    setError(null);
    preloadApp();
    const animate = !prefersReducedMotion();
    const from = animate ? zoomFrom(document.querySelector(previewSelector)) : null;
    setZoom({ from, open: false });
    // Un cuadro despues arranca la animacion.
    if (from) requestAnimationFrame(() => requestAnimationFrame(() => setZoom({ from, open: true })));
    try {
      // La app aparece cuando estan la cuenta, la animacion y el codigo de la app.
      const wait = Promise.all([from ? new Promise((resolve) => setTimeout(resolve, ZOOM_MS + 150)) : null, preloadApp()]);
      await startDemo(language, wait);
    } catch (failure) {
      setError(authErrorKey(failure));
      setZoom(from ? { from, open: "closing" } : null);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        ref={buttonRef}
        type="button"
        className="demo-cta w-fit"
        onClick={start}
        onPointerEnter={preloadApp}
        aria-busy={busy || undefined}
      >
        <span className="demo-cta-play" aria-hidden="true">
          <PlayIcon className="size-3.5 translate-x-px fill-current" />
        </span>
        {t("landingDemoCta")}
      </button>
      <p className="m-0 max-w-[46ch] text-xs leading-relaxed text-[color:var(--text-4)]">
        {t("landingDemoHint")} {t("landingDemoTermsBefore")}{" "}
        <Link to="/terminos" className="underline underline-offset-2 hover:text-foreground">
          {t("footerTerms")}
        </Link>{" "}
        {t("landingDemoTermsAnd")}{" "}
        <Link to="/privacidad" className="underline underline-offset-2 hover:text-foreground">
          {t("footerPrivacy")}
        </Link>
        .
      </p>
      {error && (
        <p role="alert" className="m-0 text-sm text-destructive">
          {t(error)}
        </p>
      )}
      {zoom?.from &&
        createPortal(
          <div className="demo-zoom" data-open={zoom.open === true} role="status" aria-live="polite">
            <div className="demo-zoom-bg" />
            <div
              className="demo-zoom-card"
              aria-hidden="true"
              style={{ ...zoom.from.box, transform: zoom.open === true ? zoom.from.to : "none" }}
              dangerouslySetInnerHTML={{ __html: zoom.from.html }}
            />
            <div className="demo-zoom-content">
              <Wordmark />
              <p className="m-0 text-sm text-[color:var(--text-3)]">{t("landingDemoLoading")}</p>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default DemoButton;
