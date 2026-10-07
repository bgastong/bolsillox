import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";

// "los Términos y condiciones y la Política de privacidad" con links (abren en otra pestaña
// para no perder lo que se esta completando).
export function LegalLinks() {
  const { t } = useLanguage();
  const linkClass = "font-medium text-foreground underline underline-offset-2 hover:no-underline";
  return (
    <>
      <Link to="/terminos" target="_blank" className={linkClass}>
        {t("termsLink")}
      </Link>{" "}
      {t("acceptTermsAnd")}{" "}
      <Link to="/privacidad" target="_blank" className={linkClass}>
        {t("privacyLink")}
      </Link>
    </>
  );
}

// Casilla obligatoria para aceptar los Terminos y la Politica de privacidad.
export function TermsCheckbox({ name, value, error, onChange }) {
  const { t } = useLanguage();
  return (
    <div className="grid gap-1.5">
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-muted-foreground">
        <input
          type="checkbox"
          name={name}
          checked={Boolean(value)}
          onChange={onChange}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${name}-error` : undefined}
          className="mt-[3px] size-[18px] shrink-0 cursor-pointer accent-[color:var(--primary)]"
        />
        <span>
          {t("acceptTermsPrefix")} <LegalLinks />.
        </span>
      </label>
      {error && (
        <p id={`${name}-error`} className="m-0 text-xs text-destructive">
          {t(error)}
        </p>
      )}
    </div>
  );
}
