import { useEffect, useRef, useState } from "react";
import { PauseIcon, PlayIcon } from "lucide-react";
import { useFirstInteraction } from "@/hooks/useFirstInteraction";
import { useLanguage } from "@/hooks/useLanguage";

// Archivos en public/video (los genera el proyecto de video/, ver video/README.md).
const SOURCES = [
  { src: "/video/bolsillox.webm", type: "video/webm" },
  { src: "/video/bolsillox.mp4", type: "video/mp4" },
];
const POSTER = "/video/bolsillox-poster.webp";

function prefersReducedMotion() {
  return typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
}

/*
Video de la pagina de inicio: cargar un gasto, la torta, el flujo de caja, metas
e inversiones. No pesa en la carga inicial: el video se pide recien cuando la
seccion esta por verse, se reproduce sin sonido y en loop mientras esta a la
vista, y se pausa al salir. Con "reducir movimiento" queda la imagen fija y se
reproduce solo si la persona toca Reproducir. Siempre hay boton de pausa.
*/
function ProductVideo() {
  const { t } = useLanguage();
  // Hasta que la persona no mueve el mouse, toca o baja, no se pide nada (como
  // las otras animaciones de la landing): la carga inicial queda liviana.
  const interacted = useFirstInteraction();
  const frameRef = useRef(null);
  const videoRef = useRef(null);
  const [visible, setVisible] = useState(false);
  // Alguna vez estuvo a la vista / tocaron Reproducir (una vez en true, quedan asi).
  const [seen, setSeen] = useState(false);
  const [requested, setRequested] = useState(false);
  // Las fuentes se agregan recien entonces (y no se sacan mas).
  // Con movimiento reducido no se descarga hasta que tocan Reproducir.
  const load = requested || (interacted && seen && !prefersReducedMotion());
  const [playing, setPlaying] = useState(false);
  // La persona lo pauso (o tiene movimiento reducido): no se reproduce solo.
  const pausedByUser = useRef(prefersReducedMotion());

  // Si la seccion esta (o esta por estar) a la vista.
  useEffect(() => {
    const element = frameRef.current;
    if (!element || !("IntersectionObserver" in window)) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
      if (entry.isIntersecting) setSeen(true);
    }, {
      rootMargin: "200px 0px",
      threshold: 0.2,
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Al agregar las fuentes, se le pide al video que las tome.
  useEffect(() => {
    if (load) videoRef.current?.load();
  }, [load]);

  // A la vista se reproduce (salvo que la hayan pausado); fuera de la vista, se pausa.
  useEffect(() => {
    const video = videoRef.current;
    if (!load || !video) return;
    if (visible && !pausedByUser.current) video.play().catch(() => {});
    else if (!visible && !video.paused) video.pause();
  }, [load, visible]);

  function toggle() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      pausedByUser.current = false;
      if (!load) setRequested(true);
      else video.play().catch(() => {});
    } else {
      pausedByUser.current = true;
      video.pause();
    }
  }

  return (
    <figure ref={frameRef} className="m-0 overflow-hidden rounded-[18px] border border-fg/10 bg-[#08090a] shadow-[var(--preview-shadow)]">
      {/* Barra de ventana, como la vista previa de la portada */}
      <div className="flex h-9 items-center gap-1.5 border-b border-white/[0.06] bg-[#0e0f11] px-3.5" aria-hidden="true">
        <span className="size-2.5 rounded-full bg-white/10" />
        <span className="size-2.5 rounded-full bg-white/10" />
        <span className="size-2.5 rounded-full bg-white/10" />
        <span className="mx-auto rounded-md bg-white/[0.04] px-10 py-0.5 font-mono text-[10.5px] text-[#82878f]">
          bolsillox.com.ar
        </span>
      </div>
      <div className="relative aspect-video">
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
        <button
          type="button"
          onClick={toggle}
          aria-label={t(playing ? "landingVideoPause" : "landingVideoPlay")}
          className="absolute right-3 bottom-3 inline-flex size-11 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-md transition-[background-color,transform] duration-150 outline-none hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-white/70 active:scale-95"
        >
          {playing ? <PauseIcon className="size-4" aria-hidden="true" /> : <PlayIcon className="size-4 translate-x-px" aria-hidden="true" />}
        </button>
      </div>
      <figcaption className="sr-only">{t("landingVideoDescription")}</figcaption>
    </figure>
  );
}

export default ProductVideo;
