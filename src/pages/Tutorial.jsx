import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import Wordmark from "@/components/Brand/Wordmark";
import { LanguageToggle } from "@/components/Auth/AuthLayout";
import { ThemeToggle } from "@/components/Theme/ThemeControls";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";

// Video del tutorial (lo arma video/: record-tutorial.cjs y render.mjs).
const SOURCES = [
  { src: "/video/tutorial.webm", type: "video/webm" },
  { src: "/video/tutorial.mp4", type: "video/mp4" },
];
const POSTER = "/video/tutorial-poster.webp";

// Segundo del video en que empieza cada capitulo (los imprime video/render.mjs).
const CHAPTERS = [3.62, 19.06, 22.27, 27.87, 31.94, 35.83, 40.7, 44.37];

function chapterAt(time) {
  let index = -1;
  CHAPTERS.forEach((start, i) => {
    if (time >= start - 0.05) index = i;
  });
  return index;
}

function formatTime(seconds) {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/*
Tutorial: la app real grabada en la compu, con zoom a lo que se va haciendo.
Se ve con o sin sesion. El video solo se descarga cuando se reproduce (antes,
solo la portada y la duracion). Los capitulos saltan a cada parte.
*/
function Tutorial() {
  const { t } = useLanguage();
  const { status } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [active, setActive] = useState(-1);
  const signedIn = status === "authenticated";

  function goTo(index) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = CHAPTERS[index] + 0.01;
    setActive(index);
    video.play().catch(() => {});
  }

  return (
    <div className="relative min-h-svh overflow-x-clip">
      <div className="bg-glow" aria-hidden="true" />
      <header className="sticky top-0 z-20 border-b border-fg/[0.06] bg-[color-mix(in_srgb,var(--background)_75%,transparent)] pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" aria-label="bolsillox" className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto grid max-w-6xl gap-10 px-4 pt-10 pb-20 sm:px-6">
        <div className="grid max-w-2xl gap-3">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
            className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm text-[color:var(--text-3)] outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeftIcon className="size-4" aria-hidden="true" />
            {t("legalBack")}
          </button>
          <h1 className="m-0 text-[32px] leading-tight font-medium tracking-[-0.04em] sm:text-[40px]">{t("tutorialTitle")}</h1>
          <p className="m-0 text-[color:var(--text-3)]">{t("tutorialSubtitle")}</p>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="overflow-hidden rounded-2xl border border-fg/10 bg-[#08090a] shadow-[var(--preview-shadow)]">
            <video
              ref={videoRef}
              className="block aspect-video w-full"
              poster={POSTER}
              controls
              playsInline
              preload="metadata"
              aria-label={t("tutorialVideoLabel")}
              aria-describedby="tutorial-description"
              onTimeUpdate={(event) => {
                const index = chapterAt(event.currentTarget.currentTime);
                setActive((current) => (current === index ? current : index));
              }}
            >
              {SOURCES.map((source) => (
                <source key={source.type} src={source.src} type={source.type} />
              ))}
            </video>
          </div>
          <p id="tutorial-description" className="sr-only">
            {t("tutorialVideoDescription")}
          </p>

          <nav aria-labelledby="tutorial-chapters" className="grid gap-2">
            <h2 id="tutorial-chapters" className="m-0 px-2 text-xs font-normal text-[color:var(--text-4)]">
              {t("tutorialChapters")}
            </h2>
            <ol className="m-0 grid list-none gap-0.5 p-0 max-lg:sm:grid-cols-2">
              {CHAPTERS.map((start, index) => {
                const on = index === active;
                return (
                  <li key={start}>
                    <button
                      type="button"
                      onClick={() => goTo(index)}
                      aria-current={on ? "step" : undefined}
                      className={cn(
                        "grid w-full grid-cols-[22px_minmax(0,1fr)_auto] items-baseline gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors outline-none hover:bg-fg/[0.04] focus-visible:ring-2 focus-visible:ring-ring",
                        on ? "bg-fg/[0.06] text-foreground" : "text-[color:var(--text-3)] hover:text-foreground",
                      )}
                    >
                      <span className="font-mono text-xs text-[color:var(--text-4)]">{index + 1}</span>
                      <span>{t(`tutorialChapter${index + 1}`)}</span>
                      <span className="font-mono text-xs text-[color:var(--text-4)] tabular-nums">{formatTime(start)}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

        <section aria-labelledby="tutorial-cta" className="grid justify-items-center gap-4 border-t border-fg/[0.06] pt-14 text-center">
          <h2 id="tutorial-cta" className="m-0 max-w-xl text-[26px] leading-[1.15] font-medium tracking-[-0.04em] sm:text-[30px]">
            {t(signedIn ? "tutorialSignedInTitle" : "tutorialCtaTitle")}
          </h2>
          {!signedIn && <p className="m-0 max-w-md text-[color:var(--text-3)]">{t("tutorialCtaText")}</p>}
          <div className="grid w-full max-w-sm gap-2.5 sm:flex sm:w-auto sm:max-w-none sm:justify-center">
            {signedIn ? (
              <Link to="/" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
                {t("tutorialOpenApp")}
                <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
              </Link>
            ) : (
              <>
                <Link to="/register" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
                  {t("landingCtaPrimary")}
                  <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
                </Link>
                <Link to="/login" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}>
                  {t("landingNavLogin")}
                </Link>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Tutorial;
