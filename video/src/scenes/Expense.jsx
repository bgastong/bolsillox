import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Camera } from "../camera";
import { Kinetic } from "../kinetic";
import { easeInOut, easeOutExpo, progress, soft } from "../motion";
import { C, CAT, MONO, SANS, alpha, money } from "../theme";
import { Card, Label, Mono } from "../ui";

/*
Escena 2: la camara arranca muy cerca del formulario y sigue lo que se escribe
(titulo, monto con sus puntos, categoria, Guardar). Al guardar se aleja para
mostrar el grafico: entra el punto nuevo, la linea baja en rojo y el saldo
descuenta el gasto. Al final se acerca al punto nuevo con su detalle.
*/

// Saldo de los ultimos 30 dias (sube con el sueldo, baja con los gastos).
const HISTORY = [
  1012, 1004, 998, 991, 1840, 1822, 1810, 1796, 1781, 1770, 1752, 1741, 1702, 1690, 1676, 1664, 1640, 1622, 1610, 1597,
  1580, 1561, 1540, 1452, 1440, 1418, 1395, 1371, 1330, 1284.3,
].map((v) => v * 1000);
const EXPENSE = 48250;
const AFTER = HISTORY.at(-1) - EXPENSE;

// Momentos (cuadros a 60 fps).
const T = {
  title: 40, // empieza a escribir el titulo
  amount: 112, // el monto
  category: 196, // elige Comida
  save: 236, // clic en Guardar
  pull: 248, // la camara se aleja
  update: 300, // entra el punto nuevo
  push: 400, // la camara se acerca al punto nuevo
};

// Mundo: formulario a la izquierda y saldo + grafico a la derecha.
const FORM = { x: 110, y: 250, w: 640 };
const CHART = { x: 820, y: 250, w: 990 };

// Donde mira la camara (centros de los controles del formulario).
const SPOT = {
  title: { x: 430, y: 547 },
  amount: { x: 430, y: 667 },
  category: { x: 380, y: 790 },
  save: { x: 600, y: 930 },
};

const CAMERA = [
  { at: 0, ...SPOT.title, s: 2.6, ry: 14, rx: 4 },
  { at: T.title + 30, ...SPOT.title, s: 2.35, ry: 6 },
  { at: T.amount + 6, ...SPOT.amount, s: 2.6, ry: 3 },
  { at: T.category - 6, ...SPOT.amount, s: 2.45 },
  { at: T.category + 14, ...SPOT.category, s: 2.2 },
  { at: T.save - 4, ...SPOT.save, s: 2.4 },
  { at: T.pull, ...SPOT.save, s: 2.3 },
  { at: T.update - 6, x: 960, y: 560, s: 1, ry: -6, rx: 3 },
  { at: T.push, x: 980, y: 560, s: 1.02, ry: 0 },
  { at: T.push + 70, x: 1520, y: 690, s: 1.7, ry: -4 },
  { at: 640, x: 1480, y: 680, s: 1.58, ry: -2 },
];

// Puntos donde se hace clic (en el mundo) y cuando.
const CLICKS = [
  { at: T.title - 6, ...SPOT.title },
  { at: T.amount - 4, ...SPOT.amount },
  { at: T.category, x: 205, y: 790 },
  { at: T.save, ...SPOT.save },
];

function Cursor({ frame }) {
  const keys = [
    { at: 0, x: SPOT.title.x + 120, y: SPOT.title.y + 60 },
    ...CLICKS.flatMap((click, i) => [
      { at: click.at - 12, x: click.x, y: click.y },
      { at: (CLICKS[i + 1]?.at ?? click.at + 40) - 26, x: click.x, y: click.y },
    ]),
  ];
  const opts = { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut };
  const x = interpolate(frame, keys.map((k) => k.at), keys.map((k) => k.x), opts);
  const y = interpolate(frame, keys.map((k) => k.at), keys.map((k) => k.y), opts);
  const press = CLICKS.reduce((s, c) => s + Math.max(0, 1 - Math.abs(frame - c.at) / 5), 0);
  const fade = 1 - progress(frame, T.pull + 10, 16);
  return (
    <>
      {CLICKS.map((click) => {
        const t = progress(frame, click.at, 26, easeOutExpo);
        if (frame < click.at || t >= 1) return null;
        return (
          <div key={click.at} style={{ position: "absolute", left: click.x - 30, top: click.y - 30, width: 60, height: 60, borderRadius: 30, border: `2px solid ${C.fg}`, opacity: (1 - t) * 0.6, transform: `scale(${0.3 + t})`, zIndex: 9 }} />
        );
      })}
      <svg width={30} height={30} viewBox="0 0 24 24" style={{ position: "absolute", left: x, top: y, opacity: fade, transform: `scale(${1 - press * 0.18})`, transformOrigin: "0 0", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.6))", zIndex: 10 }}>
        <path d="M4 2 L4 20 L9 15.5 L12.5 22 L15.5 20.6 L12.2 14.2 L19 14.2 Z" fill="#fff" stroke="#000" strokeWidth={1.2} strokeLinejoin="round" />
      </svg>
    </>
  );
}

// Campo del formulario; las letras nuevas entran con un pequeño salto.
function Field({ label, chars, focused, mono, prefix, caret, placeholder, frame, typedAt }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <Label style={{ color: C.fg, fontSize: 19, fontWeight: 500 }}>{label}</Label>
      <div
        style={{
          height: 64,
          borderRadius: 14,
          border: `1.5px solid ${focused ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.1)"}`,
          boxShadow: focused ? "0 0 0 5px rgba(255,255,255,0.07)" : "none",
          background: "rgba(255,255,255,0.03)",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          gap: 10,
          fontFamily: mono ? MONO : SANS,
          fontSize: mono ? 28 : 24,
          fontWeight: mono ? 500 : 400,
          color: C.fg,
        }}
      >
        {prefix && <span style={{ color: C.text3 }}>{prefix}</span>}
        {chars.length ? (
          <span style={{ display: "inline-flex" }}>
            {chars.map((char, i) => {
              const pop = progress(frame, typedAt(i), 10, easeOutExpo);
              const separator = char === ".";
              return (
                <span key={i} style={{ display: "inline-block", opacity: pop, transform: `translateY(${(1 - pop) * 8}px) scale(${separator ? 0.6 + pop * 0.4 : 1})`, color: separator ? C.text2 : C.fg, whiteSpace: "pre" }}>
                  {char}
                </span>
              );
            })}
          </span>
        ) : (
          <span style={{ color: C.text4 }}>{placeholder}</span>
        )}
        {caret && <span style={{ width: 2, height: 30, background: C.fg, marginLeft: -6 }} />}
      </div>
    </div>
  );
}

function ExpenseForm({ frame, fps }) {
  const title = "Supermercado";
  const titleSpeed = 4.2; // cuadros por letra
  const titleCount = Math.max(0, Math.min(title.length, Math.floor((frame - T.title) / titleSpeed) + 1));
  const digits = "48250";
  const digitSpeed = 12;
  const digitCount = Math.max(0, Math.min(digits.length, Math.floor((frame - T.amount) / digitSpeed) + 1));
  const typed = digits.slice(0, digitCount);
  const amountText = typed ? new Intl.NumberFormat("es-AR").format(Number(typed)) : "";
  // Cuando aparecio cada caracter del monto (el punto aparece con el 4.º digito).
  const amountTypedAt = (i) => {
    const digitIndex = amountText.slice(0, i + 1).replace(/\D/g, "").length - 1;
    return T.amount + Math.max(0, digitIndex) * digitSpeed;
  };
  const chip = soft(frame, fps, T.category, { damping: 14, stiffness: 180 });
  const press = Math.max(0, 1 - Math.abs(frame - (T.save + 2)) / 6);
  const blink = Math.floor(frame / 16) % 2 === 0;
  const focus = frame >= T.amount - 6 && frame < T.category ? "amount" : frame >= T.title - 6 && frame < T.amount - 6 ? "title" : null;
  const saved = soft(frame, fps, T.save + 4, { damping: 20, stiffness: 160 });

  return (
    <Card style={{ position: "absolute", left: FORM.x, top: FORM.y, width: FORM.w, display: "grid", gap: 26 }}>
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ fontFamily: SANS, fontSize: 32, fontWeight: 500, letterSpacing: -1, color: C.fg }}>Nuevo movimiento</div>
        <Label>Cargá un ingreso o un gasto.</Label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: 6, borderRadius: 16, background: C.soft }}>
        <div style={{ height: 52, borderRadius: 12, background: "#16171a", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)", display: "grid", placeItems: "center", fontFamily: SANS, fontSize: 21, fontWeight: 500, color: C.fg }}>↗ Gasto</div>
        <div style={{ height: 52, display: "grid", placeItems: "center", fontFamily: SANS, fontSize: 21, color: C.text3 }}>↙ Ingreso</div>
      </div>
      <Field label="Título" chars={[...title.slice(0, titleCount)]} placeholder="Ej.: Supermercado" focused={focus === "title"} caret={focus === "title" && blink} frame={frame} typedAt={(i) => T.title + i * titleSpeed} />
      <Field label="Monto" chars={[...amountText]} placeholder="0" mono prefix="$" focused={focus === "amount"} caret={focus === "amount" && blink} frame={frame} typedAt={amountTypedAt} />
      <div style={{ display: "grid", gap: 12 }}>
        <Label style={{ color: C.fg, fontSize: 19, fontWeight: 500 }}>Categoría</Label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            ["Comida", CAT.food],
            ["Transporte", CAT.transport],
            ["Vivienda", CAT.housing],
            ["Compras", CAT.shopping],
          ].map(([name, color], i) => {
            const active = i === 0 && frame >= T.category;
            return (
              <div
                key={name}
                style={{
                  height: 50,
                  padding: "0 20px",
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontFamily: SANS,
                  fontSize: 20,
                  color: active ? C.fg : C.text3,
                  border: `1.5px solid ${active ? color : "rgba(255,255,255,0.1)"}`,
                  background: active ? alpha(color, 0.18 * Math.min(1, chip)) : "transparent",
                  transform: active ? `scale(${0.92 + chip * 0.08})` : "none",
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: 5, background: color }} />
                {name}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
        <div style={{ height: 58, padding: "0 28px", borderRadius: 14, border: `1.5px solid ${C.borderStrong}`, display: "grid", placeItems: "center", fontFamily: SANS, fontSize: 21, color: C.fg }}>Cancelar</div>
        <div style={{ position: "relative", height: 58, padding: "0 34px", borderRadius: 14, background: C.fg, display: "grid", placeItems: "center", fontFamily: SANS, fontSize: 21, fontWeight: 500, color: C.bg, transform: `scale(${1 - press * 0.07})`, overflow: "hidden" }}>
          <span style={{ opacity: 1 - Math.min(1, saved) }}>Guardar</span>
          <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", opacity: Math.min(1, saved), transform: `scale(${0.6 + Math.min(1, saved) * 0.4})` }}>✓ Guardado</span>
        </div>
      </div>
    </Card>
  );
}

// Curva entre dos puntos con tangentes de Catmull-Rom (para pintar cada tramo aparte).
function segment(p0, p1, p2, p3) {
  const t = 0.18;
  return `C ${p1.x + (p2.x - p0.x) * t} ${p1.y + (p2.y - p0.y) * t}, ${p2.x - (p3.x - p1.x) * t} ${p2.y - (p3.y - p1.y) * t}, ${p2.x} ${p2.y}`;
}

/*
Saldo y flujo de caja "en vivo": al guardar entra un punto nuevo por la
derecha, la linea se corre un lugar a la izquierda y el tramo nuevo baja en
rojo (cada tramo va verde si sube y rojo si baja, como en la app).
*/
function LiveChart({ frame, fps }) {
  const W = CHART.w - 64 - 90; // lugar para los montos del eje
  const H = 420;
  const pad = 16;
  const lo = 900000;
  const hi = 1950000;
  const drop = soft(frame, fps, T.update + 8, { damping: 15, stiffness: 90 });
  const shift = progress(frame, T.update, 46, easeOutExpo);
  const values = [...HISTORY, HISTORY.at(-1) + (AFTER - HISTORY.at(-1)) * drop];
  const visible = HISTORY.length - 1; // tramos que entran en el ancho
  const pts = values.map((v, i) => ({
    x: pad + ((i - shift) / visible) * (W - pad * 2),
    y: pad + (1 - (v - lo) / (hi - lo)) * (H - pad * 2),
  }));
  const draw = progress(frame, T.pull - 10, 60, easeInOut);
  const showNew = frame >= T.update;
  const count = showNew ? pts.length : pts.length - 1;
  const segs = [];
  for (let i = 1; i < count; i++) {
    const p0 = pts[i - 2] ?? pts[i - 1];
    const p3 = pts[i + 1] && i + 1 < count ? pts[i + 1] : pts[i];
    const curve = `M ${pts[i - 1].x} ${pts[i - 1].y} ${segment(p0, pts[i - 1], pts[i], p3)}`;
    // Sube en verde y baja en gris (como la app por defecto); el gasto nuevo, en rojo.
    const up = values[i] >= values[i - 1];
    const isNew = i === HISTORY.length;
    segs.push({ i, curve, area: `${curve} L ${pts[i].x} ${H} L ${pts[i - 1].x} ${H} Z`, color: isNew ? C.expense : up ? C.income : C.text3 });
  }
  const last = pts[count - 1];
  const balance = HISTORY.at(-1) - EXPENSE * Math.min(1, drop);
  const tip = progress(frame, T.push + 40, 30, easeOutExpo);
  const ticks = [1800000, 1400000, 1000000];
  const yOf = (v) => pad + (1 - (v - lo) / (hi - lo)) * (H - pad * 2);
  const chip = soft(frame, fps, T.update + 14, { damping: 16, stiffness: 140 });

  return (
    <Card style={{ position: "absolute", left: CHART.x, top: CHART.y, width: CHART.w, display: "grid", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ display: "grid", gap: 10 }}>
          <Label>Saldo disponible</Label>
          <Mono style={{ fontSize: 78, fontWeight: 500, letterSpacing: -3.5, color: C.fg, lineHeight: 1 }}>{money(balance)}</Mono>
        </div>
        <div style={{ opacity: Math.min(1, chip), transform: `translateY(${(1 - Math.min(1, chip)) * 18}px) scale(${0.85 + chip * 0.15})`, padding: "10px 18px", borderRadius: 999, background: alpha(C.expense, 0.12), border: `1px solid ${alpha(C.expense, 0.35)}`, fontFamily: MONO, fontSize: 24, color: C.expense }}>
          −$ 48.250 · Supermercado
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Label style={{ fontSize: 20, color: C.fg }}>Flujo de caja</Label>
        <Label style={{ fontSize: 18 }}>Últimos 30 días</Label>
      </div>
      <svg width={W + 90} height={H + 40} style={{ overflow: "visible" }}>
        <defs>
          {[C.income, C.expense, C.text3].map((color) => (
            <linearGradient key={color} id={`area-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={alpha(color, color === C.text3 ? 0.16 : 0.32)} />
              <stop offset="100%" stopColor={alpha(color, 0)} />
            </linearGradient>
          ))}
          <filter id="line-glow" x="-10%" y="-30%" width="120%" height="160%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="plot">
            <rect x={0} y={-20} width={W} height={H + 40} />
          </clipPath>
          <clipPath id="draw">
            <rect x={-20} y={-40} width={20 + draw * (W + 40)} height={H + 80} />
          </clipPath>
        </defs>
        {/* Eje: montos a la derecha y lineas guia */}
        {ticks.map((v) => (
          <g key={v}>
            <line x1={0} x2={W} y1={yOf(v)} y2={yOf(v)} stroke="rgba(255,255,255,0.06)" strokeWidth={1.5} strokeDasharray="4 6" />
            <text x={W + 16} y={yOf(v) + 7} fill={C.text4} style={{ fontFamily: MONO, fontSize: 19 }}>
              $ {(v / 1e6).toLocaleString("es-AR")} M
            </text>
          </g>
        ))}
        {["28 sep", "6 oct", "14 oct", "22 oct", "hoy"].map((label, i) => (
          <text key={label} x={(i / 4) * W} y={H + 34} textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"} fill={C.text4} style={{ fontFamily: MONO, fontSize: 18 }}>
            {label}
          </text>
        ))}
        <g clipPath="url(#plot)">
          <g clipPath="url(#draw)">
            {segs.map((s) => (
              <path key={`a${s.i}`} d={s.area} fill={`url(#area-${s.color.slice(1)})`} />
            ))}
            <g filter="url(#line-glow)">
              {segs.map((s) => (
                <path key={`l${s.i}`} d={s.curve} fill="none" stroke={s.color} strokeWidth={5} strokeLinecap="round" />
              ))}
            </g>
          </g>
        </g>
        {draw >= 1 && (
          <>
            {showNew && (
              <>
                <line x1={last.x} x2={last.x} y1={0} y2={H} stroke={alpha(C.expense, 0.5 * tip)} strokeWidth={2} strokeDasharray="5 6" />
                <circle cx={last.x} cy={last.y} r={10 + progress(frame, T.update + 30, 50) * 46} fill="none" stroke={C.expense} strokeWidth={2.5} opacity={1 - progress(frame, T.update + 30, 50)} />
              </>
            )}
            <circle cx={last.x} cy={last.y} r={10} fill={C.bg} stroke={showNew ? C.expense : C.income} strokeWidth={4.5} />
          </>
        )}
        {/* Detalle del punto nuevo, como el tooltip de la app */}
        {tip > 0 && (
          <g transform={`translate(${last.x - 300} ${last.y - 170 - (1 - tip) * 20})`} opacity={tip}>
            <rect width={280} height={140} rx={16} fill="rgba(18,19,21,0.97)" stroke="rgba(255,255,255,0.16)" />
            <text x={20} y={36} fill={C.text4} style={{ fontFamily: SANS, fontSize: 19 }}>Hoy, 27 oct</text>
            <text x={20} y={74} fill={C.fg} style={{ fontFamily: MONO, fontSize: 22 }}>Supermercado</text>
            <text x={260} y={74} textAnchor="end" fill={C.expense} style={{ fontFamily: MONO, fontSize: 22 }}>−48.250</text>
            <text x={20} y={114} fill={C.text2} style={{ fontFamily: MONO, fontSize: 20 }}>Saldo  $ 1.236.050</text>
          </g>
        )}
      </svg>
    </Card>
  );
}

export function ExpenseScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Camera frame={frame} keys={CAMERA}>
        <ExpenseForm frame={frame} fps={fps} />
        <LiveChart frame={frame} fps={fps} />
        <Cursor frame={frame} />
      </Camera>
      <Kinetic frame={frame} start={6} end={T.pull + 10} eyebrow="Cargá un gasto" lines={["Lo anotás en segundos."]} />
      <Kinetic frame={frame} start={T.update - 30} end={T.push + 30} eyebrow="Al instante" lines={["Tu saldo y tu gráfico", "se actualizan solos."]} />
    </div>
  );
}
