import { useCurrentFrame } from "remotion";
import { LineArea } from "../charts";
import { easeInOut, progress, rise } from "../motion";
import { C, SANS } from "../theme";
import { Caption, Card, Label, Mono } from "../ui";

// Una serie de saldo con sueldos (saltos) y gastos (bajadas), de largo fijo para poder transformarla.
function series(months, seed) {
  const values = [];
  let balance = 600000;
  let rnd = seed;
  const rand = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
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
const SWITCHES = [0, 95, 165, 235];

// Escena 4: el flujo de caja cambia de rango y la linea se transforma.
export function CashflowScene() {
  const frame = useCurrentFrame();
  let index = 0;
  SWITCHES.forEach((at, i) => {
    if (frame >= at) index = i;
  });
  const morph = index === 0 ? 1 : progress(frame, SWITCHES[index], 40, easeInOut);
  const from = RANGES[Math.max(0, index - 1)].data;
  const to = RANGES[index].data;
  const values = to.map((v, i) => from[i] + (v - from[i]) * morph);
  const reveal = progress(frame, 10, 80, easeInOut);
  const range = RANGES[index];
  // Pastilla activa que se desliza entre opciones.
  const pillX = Math.max(0, index - 1 + morph);
  const min = Math.min(...values) - 80000;
  const max = Math.max(...values) + 80000;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Caption frame={frame} start={0} eyebrow="Flujo de caja" title="Tu saldo, día a día." muted="Del último mes a todo el año." style={{ position: "absolute", left: 120, top: 90 }} />
      <Card style={{ position: "absolute", left: 120, top: 360, width: 1680, height: 640, display: "grid", gridTemplateRows: "auto 1fr", gap: 24, ...rise(frame, 8) }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "grid", gap: 8 }}>
            <Label>Cambio del saldo</Label>
            <div style={{ display: "flex", gap: 18, alignItems: "baseline" }}>
              <Mono style={{ fontSize: 58, fontWeight: 500, color: range.up ? C.income : C.fg, letterSpacing: -2.5 }}>{range.change}</Mono>
              <span style={{ fontFamily: SANS, fontSize: 22, color: C.text3 }}>{range.text}</span>
            </div>
          </div>
          <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(4, 110px)", padding: 6, borderRadius: 16, background: C.soft }}>
            <div style={{ position: "absolute", top: 6, left: 6 + pillX * 110, width: 110, height: 52, borderRadius: 12, background: "#16171a", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }} />
            {RANGES.map((r, i) => (
              <div key={r.key} style={{ position: "relative", height: 52, display: "grid", placeItems: "center", fontFamily: SANS, fontSize: 21, fontWeight: 500, color: i === index ? C.fg : C.text3 }}>
                {r.key}
              </div>
            ))}
          </div>
        </div>
        <LineArea id="flow" values={values} width={1614} height={430} reveal={reveal} color={range.up ? C.income : C.expense} min={min} max={max} strokeWidth={4.5} />
      </Card>
    </div>
  );
}
