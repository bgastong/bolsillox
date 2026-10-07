import { Link } from "react-router-dom";
import {
  ArrowRightIcon,
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  BriefcaseIcon,
  CommandIcon,
  DollarSignIcon,
  FilmIcon,
  LayoutDashboardIcon,
  PiggyBankIcon,
  RepeatIcon,
  SmartphoneIcon,
  UtensilsIcon,
} from "lucide-react";
import Wordmark from "@/components/Brand/Wordmark";
import CursorDots from "@/components/Brand/CursorDots";
import LiveChart from "@/components/Landing/LiveChart";
import LiveBalance from "@/components/Landing/LiveBalance";
import { LanguageToggle } from "@/components/Auth/AuthLayout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { useCountUp } from "@/hooks/useCountUp";

// Numero de ejemplo que cuenta desde 0 al abrir la pagina.
function Counter({ value, duration = 1400 }) {
  const { locale } = useLanguage();
  const current = useCountUp(value, duration);
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(current));
}

const FEATURES = [
  { icon: LayoutDashboardIcon, title: "landingF1Title", text: "landingF1Text" },
  { icon: DollarSignIcon, title: "landingF2Title", text: "landingF2Text" },
  { icon: RepeatIcon, title: "landingF3Title", text: "landingF3Text" },
  { icon: PiggyBankIcon, title: "landingF4Title", text: "landingF4Text" },
  { icon: CommandIcon, title: "landingF5Title", text: "landingF5Text" },
  { icon: SmartphoneIcon, title: "landingF6Title", text: "landingF6Text" },
];

// Botones de cuenta: "Crear cuenta" (principal) e "Iniciar sesion".
function AuthButtons({ size = "default", primaryLabel, secondaryLabel, className }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2.5", className)}>
      <Link to="/register" className={cn(buttonVariants({ size }))}>
        {primaryLabel}
        <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
      </Link>
      <Link to="/login" className={cn(buttonVariants({ variant: "outline", size }))}>
        {secondaryLabel}
      </Link>
    </div>
  );
}

// Vista previa decorativa del resumen (datos de ejemplo, no del usuario).
function ProductPreview() {
  const { t } = useLanguage();
  const rows = [
    { icon: BriefcaseIcon, title: "Sueldo", amount: "+$ 890.000", income: true },
    { icon: UtensilsIcon, title: "Supermercado", amount: "−$ 48.250" },
    { icon: FilmIcon, title: "Cine", amount: "−$ 12.000" },
  ];

  return (
    <figure
      className="landing-preview m-0 overflow-hidden rounded-[18px] border border-white/10 bg-[#0b0c0d] shadow-[0_40px_120px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.06)]"
      aria-label={t("landingPreviewLabel")}
      role="img"
    >
      {/* Barra de ventana */}
      <div className="flex h-9 items-center gap-1.5 border-b border-white/[0.06] px-3.5" aria-hidden="true">
        <span className="size-2.5 rounded-full bg-white/10" />
        <span className="size-2.5 rounded-full bg-white/10" />
        <span className="size-2.5 rounded-full bg-white/10" />
        <span className="mx-auto rounded-md bg-white/[0.04] px-10 py-0.5 font-mono text-[10.5px] text-[color:var(--text-4)]">
          bolsillox
        </span>
      </div>

      <div className="grid gap-3 p-3.5 sm:grid-cols-12 sm:p-4" aria-hidden="true">
        <div className="surface rounded-xl p-4 sm:col-span-7">
          <p className="m-0 text-[11px] text-[color:var(--text-3)]">{t("balanceAvailable")}</p>
          <p className="m-0 mt-1.5 font-mono text-[32px] leading-none tracking-[-0.05em] sm:text-[38px]">
            <LiveBalance />
          </p>
          <div className="mt-5 flex h-1.5 gap-[3px] overflow-hidden rounded-full">
            <span className="grow-x h-full w-[58%] rounded-[2px] bg-expense" />
            <span className="grow-x h-full w-[42%] rounded-[2px] bg-income" style={{ animationDelay: "0.35s" }} />
          </div>
        </div>

        <div className="surface grid grid-cols-2 rounded-xl sm:col-span-5 sm:grid-cols-1">
          <div className="p-3.5">
            <p className="m-0 text-[11px] text-[color:var(--text-3)]">{t("incomes")}</p>
            <p className="m-0 mt-1 font-mono text-base text-income">+ <Counter value={890000} /></p>
            <span className="chip chip-good mt-1.5"><ArrowUpRightIcon className="size-3" />4,2%</span>
          </div>
          <div className="border-l border-white/[0.06] p-3.5 sm:border-t sm:border-l-0">
            <p className="m-0 text-[11px] text-[color:var(--text-3)]">{t("expenses")}</p>
            <p className="m-0 mt-1 font-mono text-base text-expense">− <Counter value={512800} /></p>
            <span className="chip chip-good mt-1.5"><ArrowDownRightIcon className="size-3" />11,6%</span>
          </div>
        </div>

        <div className="surface rounded-xl p-4 sm:col-span-7">
          <LiveChart />
        </div>

        <div className="surface rounded-xl p-2 sm:col-span-5">
          {rows.map(({ icon: Icon, title, amount, income }) => (
            <div key={title} className="flex items-center gap-2.5 rounded-lg px-1.5 py-2">
              <span className="inline-flex size-7 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.04] text-[color:var(--text-2)]">
                <Icon className="size-3.5" strokeWidth={1.75} />
              </span>
              <span className="flex-1 truncate text-[13px]">{title}</span>
              <span className={cn("font-mono text-[12.5px]", income ? "text-income" : "text-expense")}>{amount}</span>
            </div>
          ))}
        </div>
      </div>
    </figure>
  );
}

/*
Pagina de inicio para quien no inicio sesion: que es bolsillox, una vista
previa del producto y los botones para crear cuenta o iniciar sesion.
*/
function Landing() {
  const { t } = useLanguage();

  return (
    <div className="relative min-h-svh overflow-x-clip">
      <div className="bg-glow" aria-hidden="true" />
      <div className="landing-beam" aria-hidden="true" />
      <CursorDots />

      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[rgba(8,9,10,0.7)] pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" aria-label="bolsillox" className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Wordmark />
          </Link>
          <nav aria-label={t("mainNavigation")} className="flex items-center gap-2">
            <span className="max-sm:hidden">
              <LanguageToggle />
            </span>
            <Link to="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              {t("landingNavLogin")}
            </Link>
            <Link to="/register" className={cn(buttonVariants({ size: "sm" }), "max-[380px]:hidden")}>
              {t("landingNavRegister")}
            </Link>
          </nav>
        </div>
      </header>

      <main id="main-content">
        {/* Portada */}
        <section className="mx-auto grid max-w-6xl gap-12 px-4 pt-16 pb-20 sm:px-6 sm:pt-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-14">
          <div className="stagger grid gap-6">
            <p className="m-0 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-[color:var(--text-2)]">
              <span className="live-dot" aria-hidden="true" />
              {t("landingEyebrow")}
            </p>
            <h1 className="m-0 text-[42px] leading-[1.04] font-medium tracking-[-0.05em] sm:text-[50px]">
              {t("landingTitle")}
              <br />
              <span className="text-[color:var(--text-4)]">{t("landingTitleMuted")}</span>
            </h1>
            <p className="m-0 max-w-[46ch] text-[16.5px] leading-relaxed text-[color:var(--text-3)]">
              {t("landingSubtitle")}
            </p>
            <AuthButtons
              size="lg"
              primaryLabel={t("landingCtaPrimary")}
              secondaryLabel={t("landingCtaSecondary")}
            />
            <p className="m-0 text-xs text-[color:var(--text-4)]">{t("landingTrust")}</p>
          </div>

          <div className="landing-tilt">
            <ProductPreview />
          </div>
        </section>

        {/* Funcionalidades */}
        <section aria-labelledby="features-title" className="border-t border-white/[0.06]">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="grid max-w-2xl gap-3">
              <h2 id="features-title" className="m-0 text-[28px] leading-[1.15] font-medium tracking-[-0.04em] sm:text-[34px]">
                {t("landingFeaturesTitle")}
              </h2>
              <p className="m-0 text-[color:var(--text-3)]">{t("landingFeaturesSubtitle")}</p>
            </div>
            <ul className="m-0 mt-10 grid list-none gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07] p-0 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <li key={title} className="grid content-start gap-3 bg-[#0b0c0d] p-6 transition-colors hover:bg-[#101113]">
                  <span className="inline-flex size-9 items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.04] text-foreground">
                    <Icon className="size-[17px]" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <h3 className="m-0 text-[15px] font-medium">{t(title)}</h3>
                  <p className="m-0 text-sm leading-relaxed text-[color:var(--text-3)]">{t(text)}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Llamado final */}
        <section aria-labelledby="final-title" className="border-t border-white/[0.06]">
          <div className="mx-auto grid max-w-6xl justify-items-center gap-5 px-4 py-20 text-center sm:px-6">
            <h2 id="final-title" className="m-0 max-w-xl text-[28px] leading-[1.15] font-medium tracking-[-0.04em] sm:text-[36px]">
              {t("landingFinalTitle")}
            </h2>
            <p className="m-0 max-w-md text-[color:var(--text-3)]">{t("landingFinalText")}</p>
            <AuthButtons
              size="lg"
              className="justify-center"
              primaryLabel={t("landingCtaPrimary")}
              secondaryLabel={t("landingNavLogin")}
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 pb-[max(24px,env(safe-area-inset-bottom))] text-sm text-[color:var(--text-4)] sm:px-6">
          <p className="m-0">{t("footerRights", { year: new Date().getFullYear() })}</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/terminos" className="text-[color:var(--text-3)] underline-offset-4 hover:text-foreground hover:underline">
              {t("footerTerms")}
            </Link>
            <Link to="/privacidad" className="text-[color:var(--text-3)] underline-offset-4 hover:text-foreground hover:underline">
              {t("footerPrivacy")}
            </Link>
            <span className="sm:hidden">
              <LanguageToggle />
            </span>
            <a
              href="https://github.com/bgastong/bolsillox"
              target="_blank"
              rel="noreferrer"
              className="text-[color:var(--text-3)] underline-offset-4 hover:text-foreground hover:underline"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
