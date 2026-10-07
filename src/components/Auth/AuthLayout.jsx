import { useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import { EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react";
import Wordmark from "@/components/Brand/Wordmark";
import { GoogleIcon } from "@/components/Brand/BrandIcons";
import { ThemeToggle } from "@/components/Theme/ThemeControls";
import { LegalLinks } from "./LegalLinks";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";

const LANGUAGES = ["es", "en"];

// Selector de idioma ES / EN (cuenta y pagina de inicio).
export function LanguageToggle() {
  const { t, language, setLanguage } = useLanguage();
  return (
    <div role="group" aria-label={t("language")} className="flex rounded-lg border p-0.5">
      {LANGUAGES.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={language === code}
          onClick={() => setLanguage(code)}
          className={cn(
            "min-h-10 min-w-11 touch-manipulation rounded-md px-2 text-xs font-semibold uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring",
            language === code ? "bg-fg/10 text-foreground" : "text-muted-foreground",
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}

// Pantalla de cuenta (login / registro): logo, tarjeta centrada y selector de idioma.
export function AuthLayout({ title, subtitle, children, footer }) {
  const { t } = useLanguage();
  return (
    <div className="relative flex min-h-svh flex-col px-4 pt-[max(16px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
      <div className="bg-glow" aria-hidden="true" />
      <header className="flex items-center justify-between">
        <Link to="/" aria-label="bolsillox" className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </header>

      <main id="main-content" className="flex flex-1 items-center justify-center py-8">
        <div className="page-enter w-full max-w-sm">
          <div className="surface surface-hero grid gap-6 rounded-3xl bg-card p-6 sm:p-8">
            <div className="grid gap-1.5">
              <h1 className="m-0 text-2xl font-medium tracking-[-0.03em]">{title}</h1>
              {subtitle && <p className="m-0 text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {children}
          </div>
          {footer && <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>}
          <p className="mt-4 flex justify-center gap-4 text-xs text-muted-foreground">
            <Link to="/terminos" className="underline-offset-4 hover:text-foreground hover:underline">
              {t("footerTerms")}
            </Link>
            <Link to="/privacidad" className="underline-offset-4 hover:text-foreground hover:underline">
              {t("footerPrivacy")}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

// Separador "o" + boton de Google, debajo del formulario. Solo aparece si el
// servidor tiene Google configurado.
export function GoogleButton() {
  const { t } = useLanguage();
  const { config } = useAuth();
  const [connecting, setConnecting] = useState(false);

  // Si se vuelve atras desde Google, el navegador restaura la pagina tal cual
  // (bfcache): sin esto quedaria "Conectando..." para siempre.
  useEffect(() => {
    const reset = (event) => event.persisted && setConnecting(false);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  if (!config.google) return null;

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        {t("or")}
        <span className="h-px flex-1 bg-border" />
      </div>
      <a
        href={api.googleLoginUrl}
        aria-busy={connecting || undefined}
        onClick={(event) => {
          if (connecting) {
            event.preventDefault();
            return;
          }
          setConnecting(true);
        }}
        className={cn(
          "group inline-flex h-12 w-full touch-manipulation items-center justify-center gap-3 rounded-xl border border-fg/12 bg-fg/[0.03] text-[15px] font-medium text-foreground shadow-[inset_0_1px_0_rgb(var(--fg-rgb)/0.04)] transition-[background-color,border-color,transform] duration-150 outline-none select-none hover:border-fg/20 hover:bg-fg/[0.07] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.99] sm:h-11 sm:text-sm",
          connecting && "cursor-progress text-muted-foreground",
        )}
      >
        {/* El logo va en un circulo blanco: se ve igual en el tema claro y en el oscuro. */}
        <span className="flex size-6 items-center justify-center rounded-full bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.06)] transition-transform duration-200 group-hover:scale-105">
          {connecting ? (
            <Loader2Icon className="size-3.5 animate-spin text-zinc-500" aria-hidden="true" />
          ) : (
            <GoogleIcon className="size-3.5" />
          )}
        </span>
        {connecting ? t("connectingGoogle") : t("continueWithGoogle")}
      </a>
      <p className="m-0 text-center text-xs leading-relaxed text-[color:var(--text-4)]">
        {t("googleTermsPrefix")} <LegalLinks subtle />.
      </p>
    </div>
  );
}

// Campo con etiqueta, ayuda y error accesibles.
export function AuthField({ label, error, hint, type = "text", ...props }) {
  const { t } = useLanguage();
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={isPassword && visible ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn("h-12 sm:h-11", isPassword && "pr-12")}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            aria-label={t(visible ? "hidePassword" : "showPassword")}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 flex w-12 touch-manipulation items-center justify-center rounded-r-lg text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {visible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="m-0 text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="m-0 text-xs text-destructive">
          {t(error)}
        </p>
      )}
    </div>
  );
}

// Error general del formulario (credenciales incorrectas, sin conexion...).
export function FormAlert({ children }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="m-0 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      {children}
    </p>
  );
}
