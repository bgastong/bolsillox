import { useCurrentFrame, useVideoConfig } from "remotion";
import { HeadphonesIcon, PlaneIcon, ShieldCheckIcon } from "lucide-react";
import { Camera } from "../camera";
import { Kinetic } from "../kinetic";
import { easeInOut, progress, soft } from "../motion";
import { C, SANS, alpha } from "../theme";
import { Card, Label, Mono } from "../ui";

const GOALS = [
  { name: "Vacaciones en Bariloche", date: "Para el 15 de mar de 2027", saved: 496000, target: 800000, prefix: "$", status: "Este mes te faltan $ 33.334" },
  { name: "Fondo de emergencia", date: "Para el 31 de dic de 2026", saved: 1200, target: 2000, prefix: "US$", status: "Este mes ya apartaste lo necesario", good: true },
  { name: "Auriculares", date: "Sin fecha", saved: 90000, target: 90000, prefix: "$", status: "¡Meta cumplida!", good: true, done: true },
];
// Momento en que se aporta a la primera meta.
const DEPOSIT = 175;
const DEPOSIT_AMOUNT = 100000;

// Las tarjetas entran girando desde abajo (como cartas que se dan vuelta).
function flip(frame, fps, start) {
  const t = soft(frame, fps, start, { damping: 15, stiffness: 120 });
  return {
    opacity: Math.min(1, t * 1.6),
    transform: `rotateX(${(1 - t) * 75}deg) translateY(${(1 - t) * 80}px)`,
    transformOrigin: "50% 100%",
  };
}

function format(value, prefix) {
  return `${prefix} ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(Math.round(value))}`;
}

// Arranca de frente a las tres tarjetas, se acerca a la primera para el aporte y vuelve.
const CAMERA = [
  { at: 0, x: 960, y: 640, s: 1.25, rx: 14, ry: 0 },
  { at: 100, x: 960, y: 620, s: 1, rx: 0 },
  { at: DEPOSIT - 30, x: 960, y: 620, s: 1 },
  { at: DEPOSIT + 10, x: 400, y: 600, s: 1.75, ry: 8 },
  { at: DEPOSIT + 100, x: 420, y: 600, s: 1.7, ry: 4 },
  { at: 330, x: 960, y: 620, s: 1.02, ry: 0 },
];

// Escena 5: metas de ahorro que se van llenando; se aporta a una y sube.
export function GoalsScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const deposit = soft(frame, fps, DEPOSIT + 8, { damping: 24, stiffness: 70 });
  const press = Math.max(0, 1 - Math.abs(frame - DEPOSIT) / 7);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Camera frame={frame} keys={CAMERA}>
      <div style={{ position: "absolute", left: 120, top: 380, display: "grid", gridTemplateColumns: "repeat(3, 540px)", gap: 30, perspective: 1600 }}>
        {GOALS.map((goal, index) => {
          const fill = progress(frame, 30 + index * 14, 90, easeInOut);
          const extra = index === 0 ? deposit * DEPOSIT_AMOUNT : 0;
          const saved = goal.saved * fill + extra;
          const percent = Math.min(100, (saved / goal.target) * 100);
          const color = goal.done ? C.income : C.income;
          return (
            <Card key={goal.name} style={{ display: "grid", gap: 26, ...flip(frame, fps, 4 + index * 9) }}>
              <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                <span style={{ width: 62, height: 62, borderRadius: 16, display: "grid", placeItems: "center", border: `1px solid ${goal.done ? alpha(C.income, 0.35) : C.border}`, background: goal.done ? alpha(C.income, 0.1) : C.soft, fontSize: 28 }}>
                  {(() => {
                    const Icon = [PlaneIcon, ShieldCheckIcon, HeadphonesIcon][index];
                    return <Icon size={28} strokeWidth={1.75} color={goal.done ? C.income : C.text2} />;
                  })()}
                </span>
                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ fontFamily: SANS, fontSize: 26, fontWeight: 500, color: C.fg }}>{goal.name}</div>
                  <Label style={{ fontSize: 18 }}>{goal.date}</Label>
                </div>
              </div>
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span>
                    <Mono style={{ fontSize: 40, fontWeight: 500, color: C.fg }}>{format(saved, goal.prefix)}</Mono>
                    <span style={{ fontFamily: SANS, fontSize: 19, color: C.text4 }}> de {format(goal.target, goal.prefix)}</span>
                  </span>
                  <Mono style={{ fontSize: 20, color: C.text3 }}>{Math.round(percent)}%</Mono>
                </div>
                <div style={{ height: 12, borderRadius: 6, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${percent}%`, borderRadius: 6, background: color, boxShadow: index === 0 && deposit > 0.05 && deposit < 0.95 ? `0 0 18px ${alpha(C.income, 0.6)}` : "none" }} />
                </div>
                <div style={{ fontFamily: SANS, fontSize: 19, color: goal.good || (index === 0 && deposit > 0.5) ? C.income : C.text2, opacity: progress(frame, 90 + index * 14, 30) }}>
                  {index === 0 && deposit > 0.5 ? "Este mes ya apartaste lo necesario" : goal.status}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ height: 56, borderRadius: 14, background: goal.done ? "transparent" : C.fg, border: goal.done ? `1.5px solid ${C.borderStrong}` : "none", color: goal.done ? C.fg : C.bg, display: "grid", placeItems: "center", fontFamily: SANS, fontSize: 21, fontWeight: 500, transform: index === 0 ? `scale(${1 - press * 0.06})` : "none" }}>
                  ↙ Aportar
                </div>
                <div style={{ height: 56, borderRadius: 14, border: `1.5px solid ${C.borderStrong}`, color: C.fg, display: "grid", placeItems: "center", fontFamily: SANS, fontSize: 21 }}>↗ Sacar</div>
              </div>
            </Card>
          );
        })}
      </div>
      {/* "+$ 100.000" que sube desde el boton */}
      <div style={{ position: "absolute", left: 300, top: 620 - deposit * 70, opacity: deposit * (1 - progress(frame, DEPOSIT + 60, 30)), fontFamily: SANS, fontSize: 30, fontWeight: 600, color: C.income }}>
        +$ 100.000
      </div>
      </Camera>
      <Kinetic frame={frame} start={14} end={DEPOSIT - 16} eyebrow="Metas de ahorro" lines={["Juntá para lo que querés."]} />
    </div>
  );
}
