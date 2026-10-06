import { useState } from "react";
import {
  CheckIcon,
  ExternalLinkIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { CURRENCIES } from "@shared/catalog.js";
import { issuesToFieldErrors, rateSettingsSchema } from "@shared/movementSchema.js";
import AccountSection from "@/components/Account/AccountSection";
import { GitHubIcon } from "@/components/Brand/BrandIcons";
import { PageHeader } from "@/components/Movements/MovementBits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";
import { useSettings } from "@/hooks/useSettings";
import { useToast } from "@/hooks/useToast";

const LANGUAGES = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
];

const RATE_SOURCES = ["blue", "mep", "oficial"];

function Section({ id, title, description, children }) {
  return (
    <section aria-labelledby={id} className="surface grid gap-4 rounded-2xl bg-card p-5 sm:p-6">
      <div className="grid gap-1">
        <h2 id={id} className="m-0 text-lg font-medium">
          {title}
        </h2>
        {description && <p className="m-0 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

// Opciones tipo "tarjeta" seleccionables (radiogroup accesible).
function OptionCard({ checked, onSelect, title, detail, trailing, disabled }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex min-h-14 w-full touch-manipulation items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "border-primary/60 bg-primary/[0.07]"
          : "border-input hover:border-white/20 hover:bg-white/[0.02]",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border",
          checked ? "border-primary bg-primary text-primary-foreground" : "border-white/25",
        )}
      >
        {checked && <CheckIcon className="size-3" strokeWidth={3} />}
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="text-[15px] font-medium sm:text-sm">{title}</span>
        {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
      </span>
      {trailing}
    </button>
  );
}

function RateSettings() {
  const { t, locale } = useLanguage();
  const { toast } = useToast();
  const { rates, ratesError, refreshRates, saveRateSettings } = useSettings();
  const [manual, setManual] = useState(() => (rates?.manualRate ? String(rates.manualRate) : ""));
  const [manualError, setManualError] = useState(null);
  const [busy, setBusy] = useState(false);

  const source = rates?.source ?? "blue";
  const hasApiRates = rates && Object.keys(rates.rates).length > 0;

  async function choose(nextSource, manualValue = rates?.manualRate ?? null) {
    const result = rateSettingsSchema.safeParse({ source: nextSource, manualRate: manualValue ?? "" });
    if (!result.success) {
      setManualError(issuesToFieldErrors(result.error.issues).manualRate ?? "errorGeneric");
      document.getElementById("manual-rate")?.focus();
      return;
    }
    setBusy(true);
    try {
      await saveRateSettings(result.data);
      setManualError(null);
      toast(t("rateSaved"));
    } catch {
      toast(t("errorGeneric"), { variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function handleRefresh() {
    setBusy(true);
    await refreshRates();
    setBusy(false);
  }

  return (
    <Section id="settings-rate" title={t("rateTitle")} description={t("rateDescription")}>
      {(ratesError || (rates && !hasApiRates)) && (
        <p
          role="alert"
          className="m-0 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2.5 text-sm text-amber-200"
        >
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t("rateUnavailable")}
        </p>
      )}

      <div role="radiogroup" aria-label={t("rateSource")} className="grid gap-2">
        {RATE_SOURCES.map((key) => {
          const data = rates?.rates[key];
          return (
            <OptionCard
              key={key}
              checked={source === key}
              disabled={busy || !data}
              onSelect={() => choose(key)}
              title={t(`rate_${key}`)}
              detail={
                data
                  ? t("rateBuySell", {
                      buy: data.buy ? formatCurrency(data.buy, locale) : "—",
                      sell: formatCurrency(data.sell, locale),
                    })
                  : t("rateNoData")
              }
              trailing={
                data && (
                  <span className="text-base font-medium tabular-nums">
                    {formatCurrency(data.sell, locale)}
                  </span>
                )
              }
            />
          );
        })}
        <OptionCard
          checked={source === "manual"}
          disabled={busy}
          onSelect={() => choose("manual", manual)}
          title={t("rate_manual")}
          detail={t("rateManualHint")}
          trailing={
            rates?.manualRate && (
              <span className="text-base font-medium tabular-nums">
                {formatCurrency(rates.manualRate, locale)}
              </span>
            )
          }
        />
      </div>

      <form
        noValidate
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          choose("manual", manual);
        }}
      >
        <Label htmlFor="manual-rate">{t("rateManualLabel")}</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            >
              $
            </span>
            <Input
              id="manual-rate"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="1200"
              value={manual}
              onChange={(event) => {
                setManual(event.target.value);
                if (manualError) setManualError(null);
              }}
              aria-invalid={manualError ? true : undefined}
              aria-describedby={manualError ? "manual-rate-error" : undefined}
              className="pl-7 tabular-nums"
            />
          </div>
          <Button type="submit" variant="outline" disabled={busy}>
            {t("rateUseManual")}
          </Button>
        </div>
        {manualError && (
          <p id="manual-rate-error" role="alert" className="m-0 text-xs text-destructive">
            {t(manualError)}
          </p>
        )}
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <p className="m-0 text-xs text-muted-foreground">
          {rates?.fetchedAt
            ? t("rateUpdatedAt", { date: formatDateTime(rates.fetchedAt, locale) })
            : t("rateNeverUpdated")}
        </p>
        <Button variant="ghost" onClick={handleRefresh} disabled={busy}>
          <RefreshCwIcon data-icon="inline-start" className={busy ? "animate-spin" : undefined} />
          {t("rateRefresh")}
        </Button>
      </div>
    </Section>
  );
}

function Settings() {
  const { t, language, setLanguage } = useLanguage();
  const { currency, setCurrency, rate } = useSettings();

  return (
    <div className="grid gap-5">
      <PageHeader title={t("settingsTitle")} subtitle={t("settingsSubtitle")} />

      <AccountSection Section={Section} />

      <Section
        id="settings-currency"
        title={t("displayCurrencyTitle")}
        description={t("displayCurrencyDescription")}
      >
        <div role="radiogroup" aria-label={t("displayCurrencyTitle")} className="grid gap-2 sm:grid-cols-2">
          {CURRENCIES.map((code) => (
            <OptionCard
              key={code}
              checked={currency === code}
              onSelect={() => setCurrency(code)}
              title={t(`currency_${code}`)}
              detail={code}
              disabled={code === "USD" && !rate}
            />
          ))}
        </div>
        {!rate && <p className="m-0 text-xs text-amber-400">{t("rateMissingShort")}</p>}
      </Section>

      <RateSettings />

      <Section id="settings-language" title={t("language")}>
        <div role="radiogroup" aria-label={t("language")} className="grid gap-2 sm:grid-cols-2">
          {LANGUAGES.map(({ code, label }) => (
            <OptionCard
              key={code}
              checked={language === code}
              onSelect={() => setLanguage(code)}
              title={label}
              detail={code.toUpperCase()}
            />
          ))}
        </div>
      </Section>

      <Section id="settings-about" title={t("aboutTitle")} description={t("aboutDescription")}>
        <a
          href="https://github.com/bgastong/bolsillox"
          target="_blank"
          rel="noreferrer"
          className="flex min-h-14 touch-manipulation items-center gap-3 rounded-xl border border-input px-4 py-3 transition-colors outline-none hover:border-white/20 hover:bg-white/[0.02] focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
            <GitHubIcon />
          </span>
          <span className="grid flex-1 gap-0.5">
            <span className="text-[15px] font-medium sm:text-sm">{t("aboutGithub")}</span>
            <span className="text-xs text-muted-foreground">github.com/bgastong/bolsillox</span>
          </span>
          <ExternalLinkIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">{t("opensNewTab")}</span>
        </a>
      </Section>
    </div>
  );
}

export default Settings;
