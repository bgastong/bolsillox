import { useCurrentFrame, useVideoConfig } from "remotion";
import { LineArea } from "../charts";
import { easeInOut, progress, rise, soft } from "../motion";
import { C, MONO, SANS, alpha, money } from "../theme";
import { Caption, Card, Label, Mono } from "../ui";

// S&P 500 de ejemplo (sube con baches) y el dolar blue (en escala logaritmica).
function walk(n, start, end, vol, seed) {
  let rnd = seed;
  const rand = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647) - 0.5;
  let noise = 0;
  return Array.from({ length: n }, (_, i) => {
    noise = noise * 0.9 + rand() * vol;
    return start * Math.pow(end / start, i / (n - 1)) * (1 + noise);
  });
}
const SP = walk(80, 4800, 6700, 0.03, 9);
// Compras: un aporte cada 8 puntos (mensual).
const BUYS = [6, 14, 22, 30, 38, 46, 54, 62, 70];
// Dolar blue de 2011 a hoy, en log (para que se vea cada gobierno).
const DOLLAR = walk(90, Math.log(5), Math.log(1290), 0.004, 4);
const TERMS = [
  { label: "CFK II", from: 0, to: 0.27, color: "#a5b4fc" },
  { label: "Macri", from: 0.27, to: 0.54, color: "#fda4af" },
  { label: "A. Fernández", from: 0.54, to: 0.82, color: "#86efac" },
  { label: "Milei", from: 0.82, to: 1, color: "#fcd34d" },
];

// Escena 6: inversion al S&P 500 con las compras marcadas y el dolar por gobierno.
export function InvestScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = progress(frame, 20, 140, easeInOut);
  const value = 2200000 + 543662 * progress(frame, 40, 130, easeInOut);
  const bands = progress(frame, 150, 90, easeInOut);
  const dollar = progress(frame, 170, 130, easeInOut);
  const W = 746;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Caption frame={frame} start={0} eyebrow="Inversiones" title="Invertí siguiendo al S&P 500." muted="Y mirá el dólar de cada gobierno." style={{ position: "absolute", left: 120, top: 90 }} />

      <Card style={{ position: "absolute", left: 120, top: 380, width: 810, display: "grid", gap: 20, ...rise(frame, 8) }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontFamily: SANS, fontSize: 26, fontWeight: 500, color: C.fg }}>S&P mensual</div>
            <Label style={{ fontSize: 18 }}>S&P 500 · En pesos · $ 100.000 por mes</Label>
          </div>
          <span style={{ padding: "8px 16px", borderRadius: 999, background: alpha(C.income, 0.12), color: C.income, fontFamily: MONO, fontSize: 21, opacity: progress(frame, 120, 30) }}>
            +24,7%
          </span>
        </div>
        <div style={{ display: "grid", gap: 4 }}>
          <Label style={{ fontSize: 18 }}>Vale hoy</Label>
          <Mono style={{ fontSize: 54, fontWeight: 500, letterSpacing: -2.4, color: C.fg }}>{money(value)}</Mono>
        </div>
        <LineArea
          id="sp"
          values={SP}
          width={W}
          height={300}
          reveal={reveal}
          color={C.income}
          markers={BUYS.map((index) => {
            const at = (index / (SP.length - 1)) * 140 + 20;
            const pop = soft(frame, fps, at + 6, { damping: 12, stiffness: 160 });
            return { index, opacity: Math.min(1, pop * 1.5), scale: pop };
          })}
        />
        <Label style={{ fontSize: 17, color: C.text4 }}>● Cada punto es un aporte, al precio de ese día.</Label>
      </Card>

      <Card style={{ position: "absolute", left: 990, top: 380, width: 810, display: "grid", gap: 20, ...rise(frame, 16) }}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontFamily: SANS, fontSize: 26, fontWeight: 500, color: C.fg }}>Dólar blue histórico</div>
          <Label style={{ fontSize: 18 }}>Dividido por gobierno · escala logarítmica</Label>
        </div>
        <div style={{ display: "grid", gap: 4 }}>
          <Label style={{ fontSize: 18 }}>Hoy</Label>
          <Mono style={{ fontSize: 54, fontWeight: 500, letterSpacing: -2.4, color: C.fg }}>$ 1.290</Mono>
        </div>
        <div style={{ position: "relative", width: W, height: 300 }}>
          {TERMS.map((term) => (
            <div
              key={term.label}
              style={{
                position: "absolute",
                left: term.from * W,
                top: 0,
                height: 300,
                width: (term.to - term.from) * W * bands,
                background: alpha(term.color, 0.1),
                borderLeft: `2px dashed ${alpha(term.color, 0.5)}`,
                opacity: bands,
              }}
            >
              <span style={{ position: "absolute", left: 10, top: 8, fontFamily: SANS, fontSize: 17, color: C.text2, whiteSpace: "nowrap" }}>{term.label}</span>
            </div>
          ))}
          <div style={{ position: "absolute", inset: 0 }}>
            <LineArea id="usd" values={DOLLAR} width={W} height={300} reveal={dollar} color={C.text2} markers={[80, 84, 88].map((index) => {
              const pop = soft(frame, fps, 170 + (index / 89) * 130 + 6, { damping: 12, stiffness: 160 });
              return { index, opacity: Math.min(1, pop * 1.5), scale: pop };
            })} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 22, opacity: progress(frame, 260, 40) }}>
          {[["Macri", "+411%"], ["A. Fernández", "+1.273%"], ["Milei", "+27%"]].map(([name, change]) => (
            <span key={name} style={{ fontFamily: SANS, fontSize: 19, color: C.text3 }}>
              {name} <Mono style={{ color: C.expense, fontSize: 19 }}>{change}</Mono>
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}
