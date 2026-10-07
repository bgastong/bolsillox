import { useCallback, useMemo, useRef, useState } from "react";
import { CircleAlertIcon, CircleCheckIcon, TriangleAlertIcon, XIcon } from "lucide-react";
import { ToastContext } from "./ToastContextValue";
import { useLanguage } from "../hooks/useLanguage";

const DURATION_MS = 3500;
// Los avisos (presupuestos) quedan un poco mas para que se alcancen a leer.
const WARNING_DURATION_MS = 6000;

const VARIANTS = {
  success: { icon: CircleCheckIcon, className: "text-income" },
  error: { icon: CircleAlertIcon, className: "text-destructive" },
  warning: { icon: TriangleAlertIcon, className: "text-warn" },
};

/*
Notificaciones simples (ej: "Movimiento creado").
toast(message, { variant: "success" | "error" | "warning" })
*/
export function ToastProvider({ children }) {
  const { t } = useLanguage();
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (message, { variant = "success" } = {}) => {
      const id = ++nextId.current;
      setToasts((current) => [...current.slice(-2), { id, message, variant }]);
      setTimeout(() => dismiss(id), variant === "warning" ? WARNING_DURATION_MS : DURATION_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-100 flex flex-col items-center gap-2 md:inset-x-auto md:right-6 md:bottom-6 md:items-end"
      >
        {toasts.map(({ id, message, variant }) => {
          const { icon: Icon, className: iconClass } = VARIANTS[variant] ?? VARIANTS.success;
          return (
            <div
              key={id}
              role={variant === "success" ? "status" : "alert"}
              className="pointer-events-auto flex w-full max-w-sm animate-in items-center gap-3 rounded-2xl border bg-popover px-4 py-3 text-sm text-popover-foreground shadow-xl fade-in-0 slide-in-from-bottom-2"
            >
              <Icon className={`size-4 shrink-0 ${iconClass}`} aria-hidden="true" />
              <span className="flex-1">{message}</span>
              <button
                type="button"
                onClick={() => dismiss(id)}
                className="-my-2 -mr-2 inline-flex size-10 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                aria-label={t("close")}
              >
                <XIcon className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
