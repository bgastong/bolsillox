import { useCurrentFrame, useVideoConfig } from "remotion";
import { Camera } from "../camera";
import { LineArea } from "../charts";
import { Kinetic } from "../kinetic";
import { easeInOut, progress, soft } from "../motion";
import { C, SANS } from "../theme";
import { Card, Label, Mono } from "../ui";

// Una serie de saldo con sueldos (saltos) y gastos (bajadas), de largo fijo para poder transformarla.
function series(months, seed) {
  const values = [];
  let balance = 600000;
  let rnd = seed;
  const rand = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 60; i++) {
    const t = i / 59;
    const payday = Math.floor(t * months) !== Math.floor(((i - 1) / 59) * months);
    if (i > 0 && payday) balance += 820000 + rand() * 90000;
    else balance -= 18000 * (12 / months) * (0.4 + rand());
    values.push(balance + t * months * 30000);
  }
  return values;
}

const RANGES = [
  { key: "1M", data: series(1, 7), change: "−$ 96.400", up: false, text: "en el último mes" },
  { key: "3M", data: series(3, 11), change: "+$ 84.900", up: true, text: "en 3 meses" },
  { key: "6M", data: series(6, 5), change: "+$ 182.400", up: true, text: "en 6 meses" },
  { key: "1A", data: series(12, 3), change: "+$ 431.000", up: true, text: "en el último año" },
];
// Cuando cambia de rango (cuadros).
const SWITCHES = [0, 120, 185, 250];

// Primero sigue la linea mientras se dibuja; despues se aleja y se acerca a los periodos.
const CAMERA = [
  { at: 0, x: 520, y: 700, s: 1.9, ry: 14, rx: 6 },
  { at: 90, x: 1450, y: 650, s: 1.6, ry: -6, rx: 3 },
  { at: 125, x: 960, y: 620, s: 1, ry: 0, rx: 0 },
  { at: 330, x: 980, y: 600, s: 1.07 },
];

// Escena 4: el flujo de caja cambia de rango y la linea se transforma con un rebote.
export function CashflowScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  let index = 0;
  SWITCHES.forEach((at, i) => {
    if (frame >= at) index = i;
  });
  const morph = index === 0 ? 1 : soft(frame, fps, SWITCHES[index], { damping: 16, stiffness: 110 });
  const from = RANGES[Math.max(0, index - 1)].data;
  const to = RANGES[index].data;
  const values = to.map((v, i) => from[i] + (v - from[i]) * morph);
  const reveal = progress(frame, 0, 95, easeInOut);
  const range = RANGES[index];
  const pill = index === 0 ? 0 : index - 1 + soft(frame, fps, SWITCHES[index], { damping: 18, stiffness: 220 });
  // El rango vertical sigue a la linea (si saltara de golpe, se veria un tiron).
  const min = Math.min(...values) - 80000;
  const max = Math.max(...values) + 80000;
  const pop = index === 0 ? 1 : soft(frame, fps, SWITCHES[index], { damping: 14, stiffness: 200 });

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Camera frame={frame} keys={CAMERA}>
        <Card style={{ position: "absolute", left: 120, top: 300, width: 1680, height: 660, display: "grid", gridTemplateRows: "auto 1fr", gap: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div style={{ display: "grid", gap: 8 }}>
              <Label>Cambio del saldo</Label>
              <div style={{ display: "flex", gap: 18, alignItems: "baseline" }}>
                <Mono style={{ display: "inline-block", fontSize: 58, fontWeight: 500, color: range.up ? C.income : C.fg, letterSpacing: -2.5, transform: `scale(${0.9 + Math.min(1, pop) * 0.1})`, transformOrigin: "0 100%" }}>{range.change}</Mono>
                <span style={{ fontFamily: SANS, fontSize: 22, color: C.text3 }}>{range.text}</span>
              </div>
            </div>
            <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(4, 110px)", padding: 6, borderRadius: 16, background: C.soft }}>
              <div style={{ position: "absolute", top: 6, left: 6 + pill * 110, width: 110, height: 52, borderRadius: 12, background: "#1c1d21", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12), 0 6px 18px rgba(0,0,0,0.4)" }} />
              {RANGES.map((r, i) => (
                <div key={r.key} style={{ position: "relative", height: 52, display: "grid", placeItems: "center", fontFamily: SANS, fontSize: 21, fontWeight: 500, color: i === index ? C.fg : C.text3 }}>
                  {r.key}
                </div>
              ))}
            </div>
          </div>
          <LineArea id="flow" values={values} width={1614} height={450} reveal={reveal} color={range.up ? C.income : C.expense} min={min} max={max} strokeWidth={5} glow endDot />
        </Card>
      </Camera>
      <Kinetic frame={frame} start={10} eyebrow="Flujo de caja" lines={["Tu saldo, día a día."]} />
    </div>
  );
}
