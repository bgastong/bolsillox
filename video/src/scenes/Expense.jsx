import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { smoothPath } from "../charts";
import { easeInOut, progress, rise, soft } from "../motion";
import { C, CAT, MONO, SANS, alpha, money } from "../theme";
import { Caption, Card, Label, Mono } from "../ui";

// Saldo de los ultimos 30 dias (sube con el sueldo, baja con los gastos).
const HISTORY = [
  1012, 1004, 998, 991, 1840, 1822, 1810, 1796, 1781, 1770, 1752, 1741, 1702, 1690, 1676, 1664, 1640, 1622, 1610, 1597,
  1580, 1561, 1540, 1452, 1440, 1418, 1395, 1371, 1330, 1284.3,
].map((v) => v * 1000);
const EXPENSE = 48250;
const AFTER = HISTORY.at(-1) - EXPENSE;

// Momentos de la escena (cuadros a 60 fps).
const T = { title: 50, amount: 125, category: 205, save: 245, update: 262 };

// Cursor del mouse que va de un control a otro.
const CURSOR_PATH = [
  { at: 20, x: 560, y: 470 },
  { at: 42, x: 330, y: 545 },
  { at: 112, x: 330, y: 545 },
  { at: 128, x: 330, y: 668 },
  { at: 190, x: 330, y: 668 },
  { at: 205, x: 232, y: 790 },
  { at: 228, x: 232, y: 790 },
  { at: 244, x: 650, y: 930 },
];

function Cursor({ frame }) {
  const xs = CURSOR_PATH.map((p) => p.x);
  const ys = CURSOR_PATH.map((p) => p.y);
  const at = CURSOR_PATH.map((p) => p.at);
  const opts = { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut };
  const x = interpolate(frame, at, xs, opts);
  const y = interpolate(frame, at, ys, opts);
  // Se achica un poco en cada clic.
  const clicks = [42, 128, 205, 246];
  const press = clicks.reduce((s, c) => s + Math.max(0, 1 - Math.abs(frame - c) / 6), 0);
  const fade = progress(frame, 12, 16) * (1 - progress(frame, 290, 20));
  return (
    <svg width={34} height={34} viewBox="0 0 24 24" style={{ position: "absolute", left: x, top: y, opacity: fade, transform: `scale(${1 - press * 0.15})`, transformOrigin: "0 0", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.6))", zIndex: 5 }}>
      <path d="M4 2 L4 20 L9 15.5 L12.5 22 L15.5 20.6 L12.2 14.2 L19 14.2 Z" fill="#fff" stroke="#000" strokeWidth={1.2} strokeLinejoin="round" />
    </svg>
  );
}

// Campo del formulario con el texto que se va escribiendo.
function Field({ label, text, focused, mono, prefix, caret }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <Label style={{ color: C.fg, fontSize: 19, fontWeight: 500 }}>{label}</Label>
      <div
        style={{
          height: 64,
          borderRadius: 14,
          border: `1.5px solid ${focused ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.1)"}`,
          boxShadow: focused ? "0 0 0 4px rgba(255,255,255,0.08)" : "none",
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
        <span>{text}</span>
        {caret && <span style={{ width: 2, height: 30, background: C.fg, marginLeft: -6 }} />}
      </div>
    </div>
  );
}

function ExpenseForm({ frame, fps }) {
  const title = "Supermercado";
  const typedTitle = title.slice(0, Math.floor(interpolate(frame, [T.title, T.title + 55], [0, title.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  const digits = "48250";
  const typedDigits = digits.slice(0, Math.floor(interpolate(frame, [T.amount, T.amount + 60], [0, digits.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  const amountText = typedDigits ? new Intl.NumberFormat("es-AR").format(Number(typedDigits)) : "0";
  const chip = soft(frame, fps, T.category);
  const press = Math.max(0, 1 - Math.abs(frame - (T.save + 2)) / 7);
  const blink = Math.floor(frame / 18) % 2 === 0;
  const focus = frame >= T.amount - 4 ? "amount" : frame >= T.title - 6 ? "title" : null;

  return (
    <Card style={{ width: 640, display: "grid", gap: 26, ...rise(frame, 0) }}>
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ fontFamily: SANS, fontSize: 32, fontWeight: 500, letterSpacing: -1, color: C.fg }}>Nuevo movimiento</div>
        <Label>Cargá un ingreso o un gasto.</Label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: 6, borderRadius: 16, background: C.soft }}>
        <div style={{ height: 52, borderRadius: 12, background: "#16171a", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)", display: "grid", placeItems: "center", fontFamily: SANS, fontSize: 21, fontWeight: 500, color: C.fg }}>↗ Gasto</div>
        <div style={{ height: 52, display: "grid", placeItems: "center", fontFamily: SANS, fontSize: 21, color: C.text3 }}>↙ Ingreso</div>
      </div>
      <Field label="Título" text={typedTitle || <span style={{ color: C.text4 }}>Ej.: Supermercado</span>} focused={focus === "title"} caret={focus === "title" && blink} />
      <Field label="Monto" text={amountText} mono prefix="$" focused={focus === "amount" && frame < T.category} caret={focus === "amount" && frame < T.category && blink} />
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
                  background: active ? alpha(color, 0.16 * chip) : "transparent",
                  transform: active ? `scale(${1 + Math.sin(chip * Math.PI) * 0.06})` : "none",
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
        <div style={{ height: 58, padding: "0 34px", borderRadius: 14, background: C.fg, display: "grid", placeItems: "center", fontFamily: SANS, fontSize: 21, fontWeight: 500, color: C.bg, transform: `scale(${1 - press * 0.06})` }}>Guardar</div>
      </div>
    </Card>
  );
}

// Saldo y flujo de caja: al guardar, el saldo baja y la linea suma un tramo rojo.
function BalanceChart({ frame, fps }) {
  const W = 880;
  const H = 360;
  const pad = 18;
  const update = soft(frame, fps, T.update, { damping: 26, stiffness: 70 });
  const count = HISTORY.length + 1;
  const lo = 900000;
  const hi = 1900000;
  const point = (i, v) => ({ x: pad + (i / (count - 1)) * (W - pad * 2), y: pad + (1 - (v - lo) / (hi - lo)) * (H - pad * 2) });
  const base = HISTORY.map((v, i) => point(i, v));
  const reveal = progress(frame, 8, 80, easeInOut);
  const line = smoothPath(base);
  const last = base.at(-1);
  const next = point(HISTORY.length, HISTORY.at(-1) + (AFTER - HISTORY.at(-1)) * update);
  // El tramo nuevo crece desde el ultimo punto hasta el nuevo.
  const tip = { x: last.x + (next.x - last.x) * Math.min(1, update * 1.4), y: next.y };
  const segment = `M ${last.x} ${last.y} C ${last.x + (tip.x - last.x) * 0.5} ${last.y}, ${last.x + (tip.x - last.x) * 0.5} ${tip.y}, ${tip.x} ${tip.y}`;
  const balance = HISTORY.at(-1) - EXPENSE * update;
  const chip = soft(frame, fps, T.update + 6);
  const showNew = frame >= T.update;

  return (
    <Card style={{ width: 960, display: "grid", gap: 22, ...rise(frame, 10) }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ display: "grid", gap: 10 }}>
          <Label>Saldo disponible</Label>
          <Mono style={{ fontSize: 76, fontWeight: 500, letterSpacing: -3.5, color: C.fg, lineHeight: 1 }}>{money(balance)}</Mono>
        </div>
        <div style={{ opacity: chip, transform: `translateY(${(1 - chip) * 14}px) scale(${0.9 + chip * 0.1})`, padding: "10px 18px", borderRadius: 999, background: alpha(C.expense, 0.12), border: `1px solid ${alpha(C.expense, 0.35)}`, fontFamily: MONO, fontSize: 24, color: C.expense }}>
          −$ 48.250 · Supermercado
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Label style={{ fontSize: 20, color: C.fg }}>Flujo de caja</Label>
        <Label style={{ fontSize: 18 }}>Últimos 30 días</Label>
      </div>
      <svg width={W} height={H} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="bal-up" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={alpha(C.income, 0.26)} />
            <stop offset="100%" stopColor={alpha(C.income, 0)} />
          </linearGradient>
          <linearGradient id="bal-down" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={alpha(C.expense, 0.3)} />
            <stop offset="100%" stopColor={alpha(C.expense, 0)} />
          </linearGradient>
          <clipPath id="bal-clip">
            <rect x={-10} y={-30} width={10 + reveal * (W + 20)} height={H + 60} />
          </clipPath>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} stroke="rgba(255,255,255,0.05)" strokeWidth={1.5} />
        ))}
        <g clipPath="url(#bal-clip)">
          <path d={`${line} L ${last.x} ${H} L ${base[0].x} ${H} Z`} fill="url(#bal-up)" />
          <path d={line} fill="none" stroke={C.income} strokeWidth={4.5} strokeLinecap="round" />
        </g>
        {showNew && (
          <>
            <path d={`${segment} L ${tip.x} ${H} L ${last.x} ${H} Z`} fill="url(#bal-down)" />
            <path d={segment} fill="none" stroke={C.expense} strokeWidth={4.5} strokeLinecap="round" />
            <circle cx={tip.x} cy={tip.y} r={9} fill={C.bg} stroke={C.expense} strokeWidth={4} />
            {/* Onda que sale del punto nuevo */}
            <circle cx={tip.x} cy={tip.y} r={9 + progress(frame, T.update + 20, 40) * 34} fill="none" stroke={C.expense} strokeWidth={2} opacity={1 - progress(frame, T.update + 20, 40)} />
          </>
        )}
        {!showNew && reveal >= 1 && <circle cx={last.x} cy={last.y} r={8} fill={C.bg} stroke={C.income} strokeWidth={4} />}
      </svg>
    </Card>
  );
}

// Toast de "Gasto cargado" abajo del formulario.
function Toast({ frame, fps }) {
  const s = soft(frame, fps, T.save + 4);
  const out = progress(frame, 400, 30);
  return (
    <div style={{ position: "absolute", left: 1290, top: 920, opacity: s * (1 - out), transform: `translateY(${(1 - s) * 30}px)`, display: "flex", alignItems: "center", gap: 14, padding: "16px 24px", borderRadius: 16, background: C.popover, border: `1px solid ${C.borderStrong}`, fontFamily: SANS, fontSize: 21, color: C.fg }}>
      <span style={{ width: 26, height: 26, borderRadius: 13, background: alpha(C.income, 0.18), color: C.income, display: "grid", placeItems: "center", fontSize: 16 }}>✓</span>
      Movimiento guardado
    </div>
  );
}

// Escena 2: cargas un gasto y el saldo y el grafico se actualizan solos.
export function ExpenseScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const swap = progress(frame, T.update + 30, 36);
  // Al final, la camara se acerca al grafico.
  const zoom = 1 + progress(frame, 330, 200, easeInOut) * 0.05;

  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${zoom})`, transformOrigin: "75% 60%" }}>
      <div style={{ position: "absolute", left: 120, top: 70, width: 1700, height: 150 }}>
        <div style={{ position: "absolute", inset: 0, opacity: 1 - swap, filter: `blur(${swap * 8}px)` }}>
          <Caption frame={frame} start={0} eyebrow="Cargá un gasto" title="Lo anotás en segundos." />
        </div>
        <div style={{ position: "absolute", inset: 0, opacity: swap, transform: `translateY(${(1 - swap) * 20}px)` }}>
          <Caption frame={frame} start={T.update + 30} eyebrow="Al instante" title="Tu saldo y tus gráficos se actualizan solos." />
        </div>
      </div>
      <div style={{ position: "absolute", left: 120, top: 250 }}>
        <ExpenseForm frame={frame} fps={fps} />
      </div>
      <div style={{ position: "absolute", left: 840, top: 250 }}>
        <BalanceChart frame={frame} fps={fps} />
      </div>
      <Toast frame={frame} fps={fps} />
      <Cursor frame={frame} />
    </div>
  );
}
