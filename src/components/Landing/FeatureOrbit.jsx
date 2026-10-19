import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

const TICKS = 72;
// Tramos de scroll: uno por funcionalidad, mas un respiro al final.
const TAIL = 0.3;

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

const isPhone = () => window.matchMedia("(max-width: 767px)").matches;
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Elipse de la orbita segun el tamaño de la vista fija. En escritorio la
// tarjeta de arriba (≈210 px de alto) tiene que quedar debajo de la barra
// fija de la pagina y de los contadores.
const TOP_CLEARANCE = 72 + 105;

function orbitFor({ width, height }) {
  if (width < 768) {
    return { cx: width / 2, cy: height / 2 - 24, rx: width * 0.36, ry: height * 0.25 };
  }
  const cy = height / 2 + 30;
  return { cx: width / 2, cy, rx: Math.min(width * 0.34, 520), ry: Math.max(120, Math.min(height * 0.33, cy - TOP_CLEARANCE)) };
}

/*
Funcionalidades de la pagina de inicio: el billete 3D en el centro y una
orbita alrededor. Con el scroll, cada funcionalidad baja desde arriba hasta
la orbita y las anteriores avanzan en sentido horario hasta rodear el billete.

- La escena 3D (three.js) se carga aparte, solo al llegar a esta seccion.
- El loop corre solo con la seccion a la vista y la pestaña activa; las
  tarjetas se mueven con transform (sin re-render de React por cuadro).
- Celular (Android/iPhone): tarjetas compactas, la descripcion va abajo,
  altura con svh para que la barra del navegador no haga saltar la vista,
  calidad 3D reducida y sin seguir al puntero.
- Con "reducir movimiento" o sin WebGL se muestra la grilla de siempre.
*/
function FeatureOrbit({ features, fallback }) {
  const { t } = useLanguage();
  const { resolvedTheme } = useTheme();
  const [enabled] = useState(() => !prefersReducedMotion() && supportsWebGL());
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [active, setActive] = useState(0);

  const sectionRef = useRef(null);
  const stickyRef = useRef(null);
  const glRef = useRef(null);
  const cardRefs = useRef([]);
  const dotRefs = useRef([]);
  const trailRef = useRef(null);
  const progressRef = useRef(null);
  const hintRef = useRef(null);
  const sceneRef = useRef(null);
  const themeRef = useRef(resolvedTheme);

  const count = features.length;
  const orbit = useMemo(() => orbitFor(size), [size]);

  // Tema: se aplica a la escena sin recrearla.
  useEffect(() => {
    themeRef.current = resolvedTheme;
    sceneRef.current?.setTheme(resolvedTheme);
  }, [resolvedTheme]);

  // Tamaño de la vista fija (cambia al rotar el celular o achicar la ventana).
  useEffect(() => {
    const sticky = stickyRef.current;
    if (!enabled || !sticky) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
      sceneRef.current?.resize(width, height);
    });
    observer.observe(sticky);
    return () => observer.disconnect();
  }, [enabled]);

  // Loop: scroll -> progreso suavizado -> tarjetas, orbita y escena 3D.
  useEffect(() => {
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    if (!enabled || !section || !sticky) return undefined;

    let disposed = false;
    let scene = null;
    let raf = 0;
    let visible = false;
    let last = 0;
    let target = 0;
    let progress = 0;
    let lastQ = -1;
    let stage = -1;
    let pointer = { x: 0, y: 0 };
    let smoothPointer = { x: 0, y: 0 };
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    // La escena (three.js, en un chunk aparte) se descarga y arma recien
    // cuando la seccion se acerca a la pantalla.
    let loading = false;
    const loadScene = () => {
      if (loading) return;
      loading = true;
      import("./orbit/billScene")
        .then(({ createBillScene }) => {
          if (disposed || !glRef.current) return;
          scene = createBillScene(glRef.current, {
            theme: themeRef.current,
            quality: isPhone() ? "low" : "high",
          });
          scene.resize(sticky.clientWidth, sticky.clientHeight);
          sceneRef.current = scene;
          glRef.current.dataset.ready = "true";
        })
        .catch(() => {
          // Sin escena 3D la orbita y las tarjetas siguen funcionando.
        });
    };

    const readScroll = () => {
      const rect = section.getBoundingClientRect();
      const range = Math.max(1, rect.height - sticky.clientHeight);
      target = Math.min(1, Math.max(0, -rect.top / range));
    };

    const onPointer = (event) => {
      pointer = { x: event.clientX / window.innerWidth - 0.5, y: event.clientY / window.innerHeight - 0.5 };
    };

    const layout = (q) => {
      if (Math.abs(q - lastQ) < 0.0004) return;
      lastQ = q;
      const o = orbitFor({ width: sticky.clientWidth, height: sticky.clientHeight });
      const step = (Math.PI * 2) / count;
      const turned = Math.min(count - 1, Math.floor(q) + smooth(0.55, 1, q - Math.floor(q)));
      cardRefs.current.forEach((card, i) => {
        if (!card) return;
        const drop = smooth(i, i + 0.4, q);
        const angle = -Math.PI / 2 + step * Math.max(0, turned - i);
        const x = o.cx + Math.cos(angle) * o.rx;
        const y = o.cy + Math.sin(angle) * o.ry - (1 - drop) * (o.ry + 160);
        card.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
        card.style.opacity = drop.toFixed(3);
        const dot = dotRefs.current[i];
        if (dot) {
          dot.setAttribute("cx", x.toFixed(1));
          dot.setAttribute("cy", y.toFixed(1));
          dot.style.opacity = drop >= 1 ? "1" : "0";
        }
      });
      trailRef.current?.style.setProperty("stroke-dasharray", `${Math.max(0.0001, turned / count)} 1`);
    };

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      const ease = 1 - Math.pow(0.0001, dt);
      progress += (target - progress) * Math.min(1, ease * 1.6);
      smoothPointer = {
        x: smoothPointer.x + (pointer.x - smoothPointer.x) * ease,
        y: smoothPointer.y + (pointer.y - smoothPointer.y) * ease,
      };

      const q = progress * (count + TAIL);
      const nextStage = Math.min(count - 1, Math.floor(q));
      if (nextStage !== stage) {
        stage = nextStage;
        setActive(nextStage);
      }
      layout(q);
      if (progressRef.current) progressRef.current.textContent = progress.toFixed(3);
      if (hintRef.current) hintRef.current.style.opacity = progress > 0.02 ? "0" : "1";

      if (scene) {
        scene.update(dt, { progress, pointerX: smoothPointer.x, pointerY: smoothPointer.y });
        scene.render();
      }
    };

    const start = () => {
      if (raf || document.hidden || !visible) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) {
          loadScene();
          start();
        } else stop();
      },
      { rootMargin: "50% 0px" },
    );
    // Al cambiar el tamaño se recalcula la orbita aunque no haya scroll.
    const onResize = () => {
      readScroll();
      lastQ = -1;
    };

    readScroll();
    progress = target;
    io.observe(section);
    window.addEventListener("scroll", readScroll, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    if (finePointer) window.addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      disposed = true;
      stop();
      io.disconnect();
      window.removeEventListener("scroll", readScroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      scene?.dispose();
      sceneRef.current = null;
    };
  }, [enabled, count]);

  if (!enabled) return fallback;

  const goTo = (index) => {
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    if (!section || !sticky) return;
    const top = section.getBoundingClientRect().top + window.scrollY;
    const range = section.offsetHeight - sticky.clientHeight;
    window.scrollTo({ top: top + range * ((index + 0.7) / (count + TAIL)), behavior: "smooth" });
  };

  const pad = (n) => String(n).padStart(2, "0");
  const current = features[active];
  const { cx, cy, rx, ry } = orbit;

  return (
    <div ref={sectionRef} className="relative h-[560svh] max-md:h-[460svh]">
      <div ref={stickyRef} className="orbit-stage sticky top-0 h-svh overflow-hidden">
        <div
          ref={glRef}
          className="orbit-gl absolute inset-0"
          role="img"
          aria-label={t("landingOrbitSceneLabel")}
        />

        {/* Orbita: anillos, marcas, linea principal, estela de progreso y puntos */}
        {size.width > 0 && (
          <svg
            className="orbit-svg pointer-events-none absolute inset-0 z-[1] size-full"
            viewBox={`0 0 ${size.width} ${size.height}`}
            aria-hidden="true"
          >
            {[0.45, 0.72, 1.3, 1.62, 1.95].map((s) => (
              <ellipse key={s} className="orbit-ring" cx={cx} cy={cy} rx={rx * s} ry={ry * s} style={{ opacity: s < 1 ? 0.14 : 0.1 / s }} />
            ))}
            {Array.from({ length: TICKS }, (_, i) => {
              const a = (i / TICKS) * Math.PI * 2;
              const len = i % 6 ? 4 : 9;
              return (
                <line
                  key={i}
                  className="orbit-tick"
                  x1={cx + Math.cos(a) * rx * 1.08}
                  y1={cy + Math.sin(a) * ry * 1.08}
                  x2={cx + Math.cos(a) * (rx * 1.08 + len)}
                  y2={cy + Math.sin(a) * (ry * 1.08 + len)}
                />
              );
            })}
            <ellipse className="orbit-main" cx={cx} cy={cy} rx={rx} ry={ry} />
            <path
              ref={trailRef}
              className="orbit-trail"
              pathLength={1}
              d={`M ${cx} ${cy - ry} A ${rx} ${ry} 0 1 1 ${cx} ${cy + ry} A ${rx} ${ry} 0 1 1 ${cx} ${cy - ry}`}
            />
            {features.map(({ title }, i) => (
              <circle key={title} ref={(el) => {
                  dotRefs.current[i] = el;
                }} className="orbit-dot" r={4} style={{ opacity: 0 }} />
            ))}
          </svg>
        )}

        {/* Contadores (debajo de la barra fija de la pagina) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] pt-[calc(88px+env(safe-area-inset-top))]">
          <div className="mx-auto flex max-w-6xl justify-between px-4 sm:px-6">
            <div>
              <p className="m-0 font-mono text-[11px] text-[color:var(--text-4)]">{t("landingOrbitFeature")}</p>
              <p className="m-0 mt-1 font-mono text-[13px] tabular-nums">
                {pad(active + 1)} / {pad(count)}
              </p>
            </div>
            <div className="text-right">
              <p className="m-0 font-mono text-[11px] text-[color:var(--text-4)]">{t("landingOrbitProgress")}</p>
              <p ref={progressRef} className="m-0 mt-1 font-mono text-[13px] tabular-nums">0.000</p>
            </div>
          </div>
        </div>

        {/* Menu lateral para saltar a una funcionalidad */}
        <nav
          aria-label={t("landingOrbitNav")}
          className="absolute top-1/2 right-6 z-[3] flex -translate-y-1/2 flex-col gap-2.5 max-md:hidden"
        >
          {features.map(({ title }, i) => (
            <button
              key={title}
              type="button"
              aria-label={t(title)}
              aria-current={i === active ? "step" : undefined}
              onClick={() => goTo(i)}
              className={cn(
                "group flex items-center justify-end gap-2.5 rounded font-mono text-[10px] outline-none focus-visible:ring-2 focus-visible:ring-ring",
                i === active ? "text-foreground" : "text-[color:var(--text-4)] hover:text-[color:var(--text-2)]",
              )}
            >
              {pad(i + 1)}
              <span
                className={cn(
                  "h-px transition-all duration-300",
                  i === active ? "w-6 bg-income" : "w-3 bg-[color:var(--text-4)]",
                )}
              />
            </button>
          ))}
        </nav>

        {/* Tarjetas: las posiciona el loop (transform) */}
        <ul className="pointer-events-none absolute inset-0 z-[2] m-0 list-none p-0">
          {features.map(({ icon: Icon, title, text, meta, value, tone }, i) => (
            <li
              key={title}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className={cn(
                "orbit-card absolute top-0 left-0 grid w-[248px] content-start gap-3 rounded-xl border bg-card p-[18px] transition-colors duration-300 max-md:w-[132px] max-md:gap-2 max-md:p-2.5",
                i === active ? "border-fg/15 bg-accent" : "border-fg/[0.07]",
              )}
              style={{ opacity: 0 }}
            >
              <span
                className={cn(
                  "inline-flex size-9 items-center justify-center rounded-[10px] border bg-fg/[0.04] transition-colors max-md:size-7",
                  i === active ? "border-income/40 text-income" : "border-fg/10 text-foreground",
                )}
              >
                <Icon className="size-[17px] max-md:size-3.5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h3 className="m-0 text-[15px] font-medium max-md:text-[12.5px] max-md:leading-tight">{t(title)}</h3>
              <p className="m-0 text-sm leading-relaxed text-[color:var(--text-3)] max-md:hidden">{t(text)}</p>
              <div className="flex items-center justify-between border-t border-fg/[0.06] pt-3 text-xs text-[color:var(--text-4)] max-md:hidden">
                <span>{t(meta)}</span>
                <span className={cn("chip", tone === "good" && "chip-good", tone === "bad" && "chip-bad")}>{t(value)}</span>
              </div>
            </li>
          ))}
        </ul>

        {/* Titular de la funcionalidad activa; en el celular suma la descripcion */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] pb-[max(28px,calc(env(safe-area-inset-bottom)+16px))]">
          <div className="mx-auto flex max-w-6xl items-end justify-between gap-6 px-4 sm:px-6" aria-live="polite">
            <div className="max-w-md">
              <p className="m-0 font-mono text-[11px] text-[color:var(--text-4)]">
                {pad(active + 1)} — {t(current.title)}
              </p>
              <h3 key={active} className="orbit-headline m-0 mt-1.5 text-[26px] leading-[1.1] font-medium tracking-[-0.04em] sm:text-[30px]">
                {t(current.tagline)}
              </h3>
              <p key={`t-${active}`} className="orbit-headline m-0 mt-2 text-sm leading-relaxed text-[color:var(--text-3)] md:hidden">
                {t(current.text)}
              </p>
            </div>
            <p ref={hintRef} className="m-0 shrink-0 font-mono text-[11px] text-[color:var(--text-4)] transition-opacity max-md:hidden">
              {t("landingOrbitHint")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeatureOrbit;
