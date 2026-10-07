import { Link, useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "lucide-react";
import Wordmark from "@/components/Brand/Wordmark";
import { ThemeToggle } from "@/components/Theme/ThemeControls";
import { LanguageToggle } from "@/components/Auth/AuthLayout";
import { formatDate } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";

// Bloque de texto legal: parrafo o lista.
function Block({ block }) {
  if (typeof block === "string") {
    return <p className="m-0 leading-relaxed text-[color:var(--text-2)]">{block}</p>;
  }
  return (
    <ul className="m-0 grid gap-2 pl-5 text-[color:var(--text-2)]">
      {block.list.map((item) => (
        <li key={item} className="leading-relaxed marker:text-[color:var(--text-4)]">
          {item}
        </li>
      ))}
    </ul>
  );
}

/*
Pagina de un documento legal (Terminos o Privacidad): se puede ver con o
sin sesion. Tiene un indice a la izquierda en pantallas grandes.
*/
function LegalPage({ title, sections, updated, otherLink }) {
  const { t, language, locale } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="relative min-h-svh">
      <div className="bg-glow" aria-hidden="true" />
      <header className="sticky top-0 z-20 border-b border-fg/[0.06] bg-[color-mix(in_srgb,var(--background)_75%,transparent)] pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" aria-label="bolsillox" className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto grid max-w-5xl gap-10 px-4 pt-10 pb-20 sm:px-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label={t("legalContents")} className="max-lg:hidden">
          <div className="sticky top-24 grid gap-1 text-sm">
            <p className="m-0 mb-2 text-xs text-[color:var(--text-4)]">{t("legalContents")}</p>
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-md px-2 py-1 text-[color:var(--text-3)] transition-colors hover:bg-fg/[0.04] hover:text-foreground"
              >
                {section.title.replace(/^\d+\.\s*/, "")}
              </a>
            ))}
          </div>
        </nav>

        <article className="grid min-w-0 gap-8">
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
              className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm text-[color:var(--text-3)] outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeftIcon className="size-4" aria-hidden="true" />
              {t("legalBack")}
            </button>
            <h1 className="m-0 text-[32px] leading-tight font-medium tracking-[-0.04em] sm:text-[40px]">{title}</h1>
            <p className="m-0 text-sm text-[color:var(--text-4)]">
              {t("legalUpdated", { date: formatDate(updated, locale, { day: "numeric", month: "long", year: "numeric" }) })}
            </p>
            {language !== "es" && (
              <p className="m-0 rounded-lg border border-fg/10 bg-fg/[0.03] px-3 py-2 text-sm text-[color:var(--text-3)]" lang="en">
                {t("legalSpanishOnly")}
              </p>
            )}
          </div>

          <div className="grid gap-8" lang="es">
            {sections.map((section) => (
              <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="grid scroll-mt-24 gap-3">
                <h2 id={`${section.id}-title`} className="m-0 text-lg font-medium tracking-[-0.02em]">
                  {section.title}
                </h2>
                {section.blocks.map((block, index) => (
                  <Block key={index} block={block} />
                ))}
              </section>
            ))}
          </div>

          <p className="m-0 border-t border-fg/[0.06] pt-6 text-sm text-[color:var(--text-3)]">{otherLink}</p>
        </article>
      </main>
    </div>
  );
}

export default LegalPage;
