import { useEffect, useRef, useState } from "react";
import { PauseIcon, PlayIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFirstInteraction } from "@/hooks/useFirstInteraction";
import { useLanguage } from "@/hooks/useLanguage";

// Grabacion de la pantalla del celular (la arma video/make-web.sh).
const SOURCES = [
  { src: "/video/bolsillox-app.webm", type: "video/webm" },
  { src: "/video/bolsillox-app.mp4", type: "video/mp4" },
];
const POSTER = "/video/bolsillox-app-poster.webp";

/*
Cada paso del recorrido: en que segundo del video empieza y hacia donde gira el
celular (grados) mientras dura. Los textos estan en las traducciones
(landingStep1Title, landingStep1Text...).
*/
const STEPS = [
  { at: 0, turn: -16 },
  { at: 5.82, turn: -9 },
  { at: 8.18, turn: -15 },
  { at: 12.45, turn: -8 },
  { at: 15.27, turn: -14 },
  { at: 18.75, turn: -7 },
];
const TURN_SECONDS = 1.2;

function prefersReducedMotion() {
  return typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
}

function stepAt(time) {
  let index = 0;
  STEPS.forEach((step, i) => {
    if (time >= step.at) index = i;
  });
  return index;
}

const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

/*
Recorrido de la app en un celular: el video es solo la pantalla; el celular en
3D y los pasos de la izquierda son de la pagina (se ven nitidos, siguen el tema
y el idioma). El paso activo y el giro del celular siguen al segundo del video;
tocar un paso salta a esa parte.
No pesa en la carga inicial: el video se pide cuando la persona ya interactuo
con la pagina y la seccion esta por verse; se reproduce mientras esta a la vista
y se pausa al salir. Con "reducir movimiento" queda quieto hasta tocar Reproducir.
*/
function PhoneShowcase() {
  const { t } = useLanguage();
  const interacted = useFirstInteraction();
  const rootRef = useRef(null);
  const videoRef = useRef(null);
  const phoneRef = useRef(null);
  const barRefs = useRef([]);
  const [visible, setVisible] = useState(false);
  const [seen, setSeen] = useState(false);
  const [requested, setRequested] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(0);
  const pausedByUser = useRef(prefersReducedMotion());
  // Las fuentes se agregan recien cuando hace falta (y no se sacan mas).
  const load = requested || (interacted && seen && !prefersReducedMotion());

  useEffect(() => {
    const element = rootRef.current;
    if (!element || !("IntersectionObserver" in window)) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setSeen(true);
      },
      { rootMargin: "200px 0px", threshold: 0.2 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (load) videoRef.current?.load();
  }, [load]);

  useEffect(() => {
    const video = videoRef.current;
    if (!load || !video) return;
    if (visible && !pausedByUser.current) video.play().catch(() => {});
    else if (!visible && !video.paused) video.pause();
  }, [load, visible]);

  // Mientras se reproduce: paso activo, barrita del paso y giro del celular.
  useEffect(() => {
    if (!playing) return undefined;
    const reduced = prefersReducedMotion();
    let frame;
    const tick = () => {
      const video = videoRef.current;
      if (video) {
        const time = video.currentTime;
        const index = stepAt(time);
        const end = STEPS[index + 1]?.at ?? video.duration ?? time;
        setActive((current) => (current === index ? current : index));
        barRefs.current.forEach((bar, i) => {
          if (!bar) return;
          const fill = i < index ? 1 : i > index ? 0 : Math.min(1, (time - STEPS[i].at) / Math.max(0.1, end - STEPS[i].at));
          bar.style.transform = `scaleY(${fill})`;
        });
        if (!reduced && phoneRef.current) {
          const from = STEPS[index - 1]?.turn ?? STEPS[STEPS.length - 1].turn;
          const k = easeInOut(Math.min(1, (time - STEPS[index].at) / TURN_SECONDS));
          phoneRef.current.style.setProperty("--phone-turn", `${from + (STEPS[index].turn - from) * k}deg`);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  function play() {
    const video = videoRef.current;
    if (!video) return;
    pausedByUser.current = false;
    if (!load) setRequested(true);
    else video.play().catch(() => {});
  }

  function toggle() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) play();
    else {
      pausedByUser.current = true;
      video.pause();
    }
  }

  // Tocar un paso salta a esa parte del video.
  function goTo(index) {
    const video = videoRef.current;
    setActive(index);
    if (video && load) video.currentTime = STEPS[index].at + 0.01;
    play();
  }

  return (
    <div ref={rootRef} className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-20">
      <ol className="m-0 grid list-none gap-1 p-0 max-lg:order-last">
        {STEPS.map((step, index) => {
          const on = index === active;
          return (
            <li key={step.at}>
              <button
                type="button"
                onClick={() => goTo(index)}
                aria-current={on ? "step" : undefined}
                className={cn(
                  "group grid w-full grid-cols-[3px_minmax(0,1fr)] gap-5 rounded-xl px-2 py-3 text-left transition-[opacity,background-color] duration-300 outline-none hover:bg-fg/[0.03] focus-visible:ring-2 focus-visible:ring-ring",
                  on ? "opacity-100" : "opacity-55 hover:opacity-85",
                )}
              >
                <span aria-hidden="true" className="overflow-hidden rounded-full bg-fg/10">
                  <span
                    ref={(element) => (barRefs.current[index] = element)}
                    className="block h-full w-full origin-top bg-foreground"
                    style={{ transform: `scaleY(${index < active ? 1 : 0})` }}
                  />
                </span>
                <span className="grid gap-1">
                  <span className="text-[19px] leading-snug font-medium tracking-[-0.02em] sm:text-[22px]">{t(`landingStep${index + 1}Title`)}</span>
                  <span className={cn("text-sm text-[color:var(--text-3)] transition-opacity", !on && "max-lg:hidden")}>{t(`landingStep${index + 1}Text`)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="relative mx-auto grid justify-items-center gap-5 [perspective:2200px]">
        <div ref={phoneRef} className="phone-float relative" style={{ "--phone-turn": `${STEPS[0].turn}deg` }}>
          {/* Sombra en el piso (fuera del elemento que gira: con giro 3D la sombra se dibuja en bloques) */}
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-8 left-[10%] h-12 w-4/5 rounded-[50%] bg-black/40 blur-2xl" />
          <div
            className="relative w-[min(72vw,300px)] rounded-[52px] p-[10px] shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.14),inset_0_0_0_5px_#08090a] [transform:rotateY(var(--phone-turn))_rotateX(4deg)] sm:w-[310px]"
            style={{ background: "linear-gradient(150deg, #5b5f66 0%, #2a2c31 18%, #121316 55%, #2b2d32 100%)" }}
          >
            {/* Botones laterales */}
            <span aria-hidden="true" className="absolute top-[118px] -left-[3px] h-6 w-[4px] rounded-l bg-[#2c2e33]" />
            <span aria-hidden="true" className="absolute top-[164px] -left-[3px] h-12 w-[4px] rounded-l bg-[#2c2e33]" />
            <span aria-hidden="true" className="absolute top-[222px] -left-[3px] h-12 w-[4px] rounded-l bg-[#2c2e33]" />
            <span aria-hidden="true" className="absolute top-[180px] -right-[3px] h-20 w-[4px] rounded-r bg-[#2c2e33]" />
            <div className="relative aspect-[390/844] overflow-hidden rounded-[42px] bg-[#08090a]">
              <video
                ref={videoRef}
                className="absolute inset-0 size-full object-cover"
                poster={POSTER}
                muted
                loop
                playsInline
                preload="none"
                aria-label={t("landingVideoLabel")}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEmptied={() => setPlaying(false)}
              >
                {load && SOURCES.map((source) => <source key={source.type} src={source.src} type={source.type} />)}
              </video>
              {/* Isla dinamica y reflejo del vidrio */}
              <span aria-hidden="true" className="absolute top-[9px] left-1/2 h-[26px] w-[88px] -translate-x-1/2 rounded-full bg-black" />
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(118deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.02)_30%,transparent_46%)]" />
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-label={t(playing ? "landingVideoPause" : "landingVideoPlay")}
          className="relative z-10 inline-flex h-10 items-center gap-2 rounded-full border border-fg/12 bg-fg/[0.04] px-4 text-sm text-[color:var(--text-2)] backdrop-blur-md transition-colors outline-none hover:bg-fg/[0.08] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
        >
          {playing ? <PauseIcon className="size-4" aria-hidden="true" /> : <PlayIcon className="size-4" aria-hidden="true" />}
          {t(playing ? "landingVideoPauseShort" : "landingVideoPlayShort")}
        </button>
      </div>
      <p className="sr-only">{t("landingVideoDescription")}</p>
    </div>
  );
}

export default PhoneShowcase;
