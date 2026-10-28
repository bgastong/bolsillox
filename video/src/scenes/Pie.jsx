import { useCurrentFrame, useVideoConfig } from "remotion";
import { Camera } from "../camera";
import { Pie } from "../charts";
import { Kinetic } from "../kinetic";
import { easeInOut, easeOutExpo, progress, soft } from "../motion";
import { C, CAT, SANS, money } from "../theme";
import { Card, Mono } from "../ui";

const SLICES = [
  { label: "Vivienda", value: 320000, color: CAT.housing, change: "= 0%", tone: C.text4 },
  { label: "Comida", value: 162750, color: CAT.food, change: "▲ 16,8%", tone: C.expense },
  { label: "Compras", value: 60000, color: CAT.shopping, change: "▼ 45,5%", tone: C.income },
  { label: "Transporte", value: 45000, color: CAT.transport, change: "▲ 8,1%", tone: C.expense },
  { label: "Servicios", value: 38000, color: CAT.services, change: "▼ 3,2%", tone: C.income },
  { label: "Salidas", value: 22000, color: CAT.entertainment, change: "nuevo", tone: C.text4 },
];
const TOTAL = SLICES.reduce((sum, item) => sum + item.value, 0);
const PIE_CENTER = { x: 500, y: 600 };

// La camara arranca pegada a la torta mientras gira y se aleja para mostrar la lista.
const CAMERA = [
  { at: 0, ...PIE_CENTER, s: 2.1, ry: 18, rx: 6 },
  { at: 40, ...PIE_CENTER, s: 1.9, ry: 10 },
  { at: 130, x: 960, y: 600, s: 1, ry: -4, rx: 2 },
  { at: 330, x: 1020, y: 600, s: 1.06, ry: 0 },
];

// Escena 3: gastos por categoria, en una torta que entra girando y una lista.
export function PieScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sweep = progress(frame, 0, 70, easeInOut);
  const labels = progress(frame, 70, 26, easeOutExpo);
  // Despues se resalta una porcion por vez (como al pasar el mouse por la lista).
  const step = Math.floor((frame - 150) / 45);
  const lift = frame >= 150 && step < 3 ? step : -1;
  const liftAmount = lift >= 0 ? soft(frame, fps, 150 + step * 45, { damping: 12, stiffness: 170 }) * 22 : 0;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Camera frame={frame} keys={CAMERA}>
        <Card style={{ position: "absolute", left: 110, top: 290, width: 780, height: 620, display: "grid", placeItems: "center" }}>
          <Pie slices={SLICES} size={480} sweep={sweep} labels={labels} lift={lift} liftAmount={liftAmount} />
        </Card>
        <Card style={{ position: "absolute", left: 950, top: 290, width: 860, padding: 26, display: "grid", gap: 6 }}>
          {SLICES.map((item, index) => {
            const appear = progress(frame, 90 + index * 7, 30, easeOutExpo);
            const bar = progress(frame, 100 + index * 7, 50, easeInOut);
            const active = index === lift;
            return (
              <div
                key={item.label}
                style={{
                  opacity: appear,
                  transform: `translateX(${(1 - appear) * 60}px)`,
                  display: "flex",
                  alignItems: "center",
                  gap: 22,
                  padding: "15px 18px",
                  borderRadius: 16,
                  background: active ? "rgba(255,255,255,0.05)" : "transparent",
                }}
              >
                <span style={{ width: 52, height: 52, borderRadius: 14, border: `1px solid ${C.border}`, background: C.soft, display: "grid", placeItems: "center" }}>
                  <span style={{ width: 14, height: 14, borderRadius: 7, background: item.color }} />
                </span>
                <div style={{ flex: 1, display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontFamily: SANS, fontSize: 26, color: C.fg }}>
                      {item.label} <Mono style={{ fontSize: 20, color: C.text4 }}>{Math.round((item.value / TOTAL) * 100)}%</Mono>
                    </span>
                    <Mono style={{ fontSize: 24, color: C.text2 }}>{money(item.value * bar)}</Mono>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(item.value / SLICES[0].value) * 100 * bar}%`, borderRadius: 3, background: item.color, boxShadow: active ? `0 0 14px ${item.color}` : "none" }} />
                  </div>
                </div>
                <Mono style={{ width: 120, textAlign: "right", fontSize: 21, color: item.tone }}>{item.change}</Mono>
              </div>
            );
          })}
        </Card>
      </Camera>
      <Kinetic frame={frame} start={20} eyebrow="Gastos por categoría" lines={["Mirá a dónde se va tu plata."]} />
    </div>
  );
}
