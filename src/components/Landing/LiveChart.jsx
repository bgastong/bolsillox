import { useEffect, useRef } from "react";

const SAMPLES = 48;
// Unidades de la curva que entran en el ancho y velocidad (unidades por segundo).
const SPAN = 9;
const SPEED = 0.45;

// Curvas de ejemplo: suma de ondas suaves (siempre igual, no es aleatorio).
// Devuelven un valor entre 0 y 1 (alto relativo del grafico).
const income = (u) => 0.64 + 0.1 * Math.sin(u * 0.7) + 0.05 * Math.sin(u * 1.9 + 1.3) + 0.025 * Math.sin(u * 4.3);
const expense = (u) => 0.36 + 0.08 * Math.sin(u * 0.9 + 2.1) + 0.05 * Math.sin(u * 2.4 + 0.4) + 0.02 * Math.sin(u * 5.7 + 1);

function points(fn, start, width, height) {
  return Array.from({ length: SAMPLES + 1 }, (_, index) => {
    const t = index / SAMPLES;
    return [t * width, height - fn(start + t * SPAN) * height];
  });
}

function linePath(pts) {
  return pts.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

/*
Grafico "en vivo" de la pagina de inicio: ingresos (verde) y gastos (rojo)
se desplazan continuamente hacia la izquierda. Se actualiza el SVG directo
(sin re-render de React), se pausa fuera de pantalla o con la pestaña
oculta y queda quieto si el sistema pide menos movimiento.
*/
function LiveChart() {
  const svgRef = useRef(null);
  const areaRef = useRef(null);
  const incomeRef = useRef(null);
  const expenseRef = useRef(null);
  const incomeDotRef = useRef(null);
  const expenseDotRef = useRef(null);

  useEffect(() => {
    // El viewBox sigue el tamaño real del SVG, asi los puntos no se deforman.
    const size = { width: 520, height: 150 };
    let start = 0;

    function draw(offset) {
      const { width, height } = size;
      const up = points(income, offset, width, height);
      const down = points(expense, offset, width, height);
      const upLine = linePath(up);
      incomeRef.current?.setAttribute("d", upLine);
      expenseRef.current?.setAttribute("d", linePath(down));
      areaRef.current?.setAttribute("d", `${upLine} L${width},${height} L0,${height}Z`);
      const [ux, uy] = up.at(-1);
      const [dx, dy] = down.at(-1);
      incomeDotRef.current?.setAttribute("transform", `translate(${ux} ${uy})`);
      expenseDotRef.current?.setAttribute("transform", `translate(${dx} ${dy})`);
    }

    const resize = new ResizeObserver(([entry]) => {
      size.width = Math.max(entry.contentRect.width, 1);
      size.height = Math.max(entry.contentRect.height, 1);
      svgRef.current?.setAttribute("viewBox", `0 0 ${size.width} ${size.height}`);
      draw(start);
    });
    resize.observe(svgRef.current);

    draw(0);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return () => resize.disconnect();
    }

    let frame = null;
    let visible = true;
    let last = performance.now();

    function tick(now) {
      // Si la pestaña estuvo oculta, no se "salta" de golpe.
      const elapsed = Math.min((now - last) / 1000, 0.1);
      last = now;
      start += elapsed * SPEED;
      draw(start);
      frame = requestAnimationFrame(tick);
    }

    function play() {
      if (frame || !visible || document.hidden) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }

    function pause() {
      if (frame) cancelAnimationFrame(frame);
      frame = null;
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) play();
      else pause();
    });
    observer.observe(svgRef.current);
    const handleVisibility = () => (document.hidden ? pause() : play());
    document.addEventListener("visibilitychange", handleVisibility);
    play();

    return () => {
      pause();
      observer.disconnect();
      resize.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 520 150"
      className="block h-28 w-full overflow-visible sm:h-32"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="live-income" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3ecf8e" stopOpacity=".25" />
          <stop offset="1" stopColor="#3ecf8e" stopOpacity="0" />
        </linearGradient>
        {/* Las curvas aparecen y se pierden suave en los bordes */}
        <linearGradient id="live-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.12" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id="live-mask">
          <rect width="100%" height="120%" y="-10%" fill="url(#live-fade)" />
        </mask>
      </defs>
      {["25%", "50%", "75%"].map((y) => (
        <line key={y} x1="0" x2="100%" y1={y} y2={y} strokeDasharray="2 5" style={{ stroke: "rgb(var(--fg-rgb) / 0.06)" }} />
      ))}
      <g mask="url(#live-mask)">
        <path ref={areaRef} fill="url(#live-income)" />
        <path ref={incomeRef} fill="none" stroke="#3ecf8e" strokeWidth="2" strokeLinejoin="round" />
        <path ref={expenseRef} fill="none" stroke="#f2555a" strokeWidth="2" strokeLinejoin="round" />
      </g>
      <g ref={incomeDotRef}>
        <circle r="7" fill="#3ecf8e" className="live-ping" />
        <circle r="3.5" stroke="#3ecf8e" strokeWidth="2" style={{ fill: "var(--surface-base)" }} />
      </g>
      <g ref={expenseDotRef}>
        <circle r="7" fill="#f2555a" className="live-ping" style={{ animationDelay: "0.6s" }} />
        <circle r="3.5" stroke="#f2555a" strokeWidth="2" style={{ fill: "var(--surface-base)" }} />
      </g>
    </svg>
  );
}

export default LiveChart;
