import { AbsoluteFill, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { easeInOut, easeOutExpo, progress, soft } from "./motion";
import { C, SANS } from "./theme";
import { Background, Fonts, Wordmark } from "./ui";

/*
Video de la landing: la app real en un celular en 3D, con frases a la
izquierda que se van marcando a medida que se recorre la web.
La grabacion (public/app-recording.mp4) la hace record-app.cjs: momentos en
segundos de esa grabacion; entre Metas e Inversiones se corta un segundo de
carga.
*/
const FPS = 60;
const RATE = 1.1; // la grabacion va un poco mas rapida
const CUT_FROM = 20.62; // ultimo momento en Metas
const CUT_TO = 21.8; // Inversiones ya cargada
const END = 27.6;
const OVERLAP = 0.1; // fundido corto en el corte

// Segundo de la grabacion -> cuadro del video.
function frameOf(t) {
  const seconds = t <= CUT_FROM ? t / RATE : (CUT_FROM + (t - CUT_TO)) / RATE;
  return Math.round(seconds * FPS);
}
export const PHONE_FRAMES = frameOf(END) + 40;

const LINES = [
  { from: 0, to: 6.4, title: "Cargá un gasto en segundos", text: "Con los montos que se completan solos." },
  { from: 6.4, to: 9.0, title: "Tu saldo, al instante", text: "Cada movimiento suma o resta en el momento." },
  { from: 9.0, to: 13.7, title: "Mirá tu flujo de caja", text: "Del último mes a todo el año." },
  { from: 13.7, to: 16.8, title: "Sabé a dónde se va tu plata", text: "Tus gastos por categoría, mes a mes." },
  { from: 16.8, to: CUT_FROM, title: "Juntá para tus metas", text: "Y sabé cuánto apartar cada mes." },
  { from: CUT_TO, to: END, title: "Seguí tus inversiones", text: "El S&P 500 y el dólar de cada gobierno." },
];

// Giro del celular a lo largo del video (segundos de la grabacion -> grados).
const TURNS = [
  [0, -30],
  [1.4, -18],
  [6.4, -11],
  [9.0, -19],
  [13.7, -12],
  [16.8, -18],
  [CUT_TO, -10],
  [END, -15],
];

const SCREEN_W = 418;
const SCREEN_H = Math.round((SCREEN_W * 844) / 390);
const BEZEL = 15;

function Screen() {
  const cutFrame = frameOf(CUT_FROM);
  const overlap = Math.round(OVERLAP * FPS);
  const style = { width: SCREEN_W, height: SCREEN_H, display: "block" };
  return (
    <>
      <Sequence durationInFrames={cutFrame + overlap}>
        <OffthreadVideo src={staticFile("app-recording.mp4")} playbackRate={RATE} style={style} muted />
      </Sequence>
      <Sequence from={cutFrame - overlap}>
        <CutIn overlap={overlap * 2}>
          <OffthreadVideo src={staticFile("app-recording.mp4")} startFrom={Math.round((CUT_TO - OVERLAP * RATE) * FPS)} playbackRate={RATE} style={style} muted />
        </CutIn>
      </Sequence>
    </>
  );
}

function CutIn({ overlap, children }) {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: progress(frame, 0, overlap, easeInOut) }}>{children}</AbsoluteFill>;
}

// Celular: borde de titanio, botones laterales, isla dinamica y un reflejo suave.
function Phone({ frame, fps }) {
  const enter = soft(frame, fps, 0, { damping: 18, stiffness: 70 });
  const at = TURNS.map(([t]) => frameOf(t));
  const ry = interpolate(frame, at, TURNS.map(([, deg]) => deg), { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
  const float = Math.sin(frame / 55) * 9;
  // Se acerca un poco mientras se escribe el gasto.
  const zoom = 1 + 0.045 * (progress(frame, frameOf(1.2), 50, easeInOut) - progress(frame, frameOf(6.2), 60, easeInOut));
  const outerW = SCREEN_W + BEZEL * 2;
  const outerH = SCREEN_H + BEZEL * 2;
  const side = { position: "absolute", width: 5, borderRadius: 3, background: "linear-gradient(90deg, #3a3d42, #1d1f23)" };
  return (
    <div style={{ position: "absolute", left: 1355 - outerW / 2, top: (1080 - outerH) / 2, perspective: 2400 }}>
      {/* Sombra en el piso */}
      <div style={{ position: "absolute", left: 50, top: outerH - 20, width: outerW - 100, height: 50, borderRadius: "50%", background: "rgba(0,0,0,0.7)", filter: "blur(26px)", opacity: enter, transform: `scale(${1 - float / 140})` }} />
      <div
        style={{
          position: "relative",
          width: outerW,
          height: outerH,
          opacity: Math.min(1, enter * 1.4),
          transform: `translateY(${float + (1 - enter) * 140}px) rotateY(${ry - (1 - enter) * 20}deg) rotateX(${4 + (1 - enter) * 8}deg) scale(${zoom})`,
          transformStyle: "preserve-3d",
        }}
      >
        <span style={{ ...side, left: -4, top: 170, height: 34 }} />
        <span style={{ ...side, left: -4, top: 236, height: 70 }} />
        <span style={{ ...side, left: -4, top: 320, height: 70 }} />
        <span style={{ ...side, right: -4, top: 260, height: 110 }} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 74,
            padding: BEZEL,
            background: "linear-gradient(150deg, #5b5f66 0%, #2a2c31 18%, #121316 55%, #2b2d32 100%)",
            boxShadow: "0 100px 160px -50px rgba(0,0,0,0.95), inset 0 0 0 1.5px rgba(255,255,255,0.14), inset 0 0 0 6px #08090a",
          }}
        >
          <div style={{ position: "relative", width: SCREEN_W, height: SCREEN_H, borderRadius: 60, overflow: "hidden", background: "#08090a" }}>
            <Screen />
            {/* Isla dinamica */}
            <div style={{ position: "absolute", top: 13, left: "50%", width: 124, height: 36, marginLeft: -62, borderRadius: 20, background: "#000" }} />
            {/* Reflejo del vidrio: se corre un poco con el giro */}
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(${118 + ry}deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.02) 30%, rgba(255,255,255,0) 46%)`, pointerEvents: "none" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Frases de la izquierda: la activa en blanco con una barrita que se va llenando.
function Lines({ frame }) {
  return (
    <div style={{ position: "absolute", left: 150, top: 120, width: 760, display: "grid", gap: 54 }}>
      <div style={{ opacity: progress(frame, 0, 40), transform: `translateY(${(1 - progress(frame, 0, 40, easeOutExpo)) * 16}px)` }}>
        <Wordmark size={0.95} />
      </div>
      <div style={{ display: "grid", gap: 26 }}>
        {LINES.map((line, i) => {
          const from = frameOf(line.from);
          const to = frameOf(line.to);
          const appear = progress(frame, 12 + i * 6, 36, easeOutExpo);
          const on = progress(frame, from, 22, easeOutExpo) * (1 - progress(frame, to, 22, easeInOut));
          const fill = frame >= to ? 1 : progress(frame, from, to - from, (v) => v);
          return (
            <div key={line.title} style={{ display: "grid", gridTemplateColumns: "4px 1fr", gap: 26, opacity: appear * (0.28 + 0.72 * on), transform: `translateX(${(1 - appear) * -40 + on * 10}px)` }}>
              <div style={{ borderRadius: 2, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                <div style={{ width: "100%", height: `${fill * 100}%`, background: C.fg }} />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontFamily: SANS, fontSize: 44, fontWeight: 500, letterSpacing: -1.8, lineHeight: 1.05, color: C.fg }}>{line.title}</div>
                <div style={{ fontFamily: SANS, fontSize: 23, color: C.text3, opacity: 0.35 + 0.65 * on }}>{line.text}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PhoneVideo() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // Entra desde negro y termina en negro (el loop de la pagina no salta).
  const fade = progress(frame, 0, 24) * (1 - progress(frame, durationInFrames - 30, 30));
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Fonts />
      <AbsoluteFill style={{ opacity: fade }}>
        <Background shift={Math.sin(frame / 200)} />
        <Lines frame={frame} />
        <Phone frame={frame} fps={fps} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
