import { AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Camera } from "./camera";
import { easeInOut, easeOutExpo, progress } from "./motion";
import { C, MONO, SANS } from "./theme";
import { Background, Fonts, Wordmark } from "./ui";
import recording from "../public/tutorial-marks.json";
import { OUTRO, RATE, START, timeline, videoSecond } from "./chapters";

/*
Tutorial de bolsillox: la app real grabada en la compu (record-tutorial.cjs)
dentro de una ventana, con una camara que se acerca sola a lo que se esta
haciendo. Los momentos y las posiciones salen de public/tutorial-marks.json, asi
que si se vuelve a grabar la camara se acomoda sola.
*/
export const FPS = 60;
const { mark: MARK, chapters: CHAPTERS, end: END } = timeline(recording);

// Segundo de la grabacion -> cuadro del video.
const F = (t) => Math.round(videoSecond(t) * FPS);
export const TUTORIAL_FRAMES = Math.round((videoSecond(END) + OUTRO) * FPS);

// Ventana: la grabacion (1440x900) se ve a 1600x1000 con una barra arriba.
const VIEW = recording.viewport;
const WIN_W = 1600;
const K = WIN_W / VIEW.width;
const WIN_H = Math.round(VIEW.height * K);
const BAR = 36;
const OX = (1920 - WIN_W) / 2;
const OY = (1080 - WIN_H - BAR) / 2;

// Punto de la grabacion (dentro de la caja de un momento) -> punto del "mundo".
function at(name, fx = 0.5, fy = 0.5) {
  const box = MARK[name].box;
  const y = Math.min(VIEW.height - 60, box.y + box.h * fy);
  return { x: OX + (box.x + box.w * fx) * K, y: OY + BAR + y * K };
}
const WIDE = { x: 960, y: 540, s: 1 };

const CAMERA = [
  { at: 0, ...WIDE, s: 0.82, rx: 14, ry: -10 },
  { at: F(START), ...WIDE, s: 0.82, rx: 14, ry: -10 },
  { at: F(MARK.newBtn.t - 1.4), ...WIDE },
  { at: F(MARK.newBtn.t - 0.2), ...at("newBtn"), s: 1.7 },
  { at: F(MARK.newBtn.t + 0.6), ...at("newBtn"), s: 1.7 },
  { at: F(MARK.title.t), ...at("title", 0.35), s: 2.3 },
  { at: F(MARK.amount.t - 0.5), ...at("title", 0.45), s: 2.3 },
  { at: F(MARK.amount.t), ...at("amount", 0.35), s: 2.4 },
  { at: F(MARK.category.t - 0.2), ...at("amount", 0.35), s: 2.4 },
  { at: F(MARK.category.t + 0.5), ...at("category", 1.8), s: 2 },
  { at: F(MARK.method.t + 0.4), ...at("method", 0.4), s: 2 },
  { at: F(MARK.save.t - 0.4), ...at("save", -0.6), s: 2.1 },
  { at: F(MARK.save.t + 0.3), ...at("save", -0.6), s: 2.1 },
  { at: F(MARK.balance.t - 0.1), ...WIDE, ry: 4 },
  { at: F(MARK.balance.t + 0.8), ...at("balance", 0.4, 0.4), s: 1.75 },
  { at: F(MARK.balance.t + 2.1), ...at("balance", 0.4, 0.4), s: 1.75 },
  { at: F(MARK.cashflow.t - 0.6), ...WIDE, s: 1.1 },
  { at: F(MARK.cashflow.t + 0.4), ...at("cashflow", 0.45, 0.55), s: 1.55 },
  { at: F(MARK.cashflowYear.t - 0.8), ...at("cashflow", 0.7, 0.55), s: 1.6 },
  { at: F(MARK.cashflowYear.t), ...at("cashflow", 0.85, 0.3), s: 1.75 },
  { at: F(MARK.categories.t - 0.4), ...at("cashflow", 0.85, 0.3), s: 1.75 },
  { at: F(MARK.categories.t + 0.5), ...at("categories", 0.5, 0.45), s: 1.95 },
  { at: F(MARK.budgets.t - 2.2), ...at("categories", 0.5, 0.45), s: 1.95 },
  { at: F(MARK.budgets.t - 1), ...WIDE, ry: -4 },
  { at: F(MARK.budgets.t + 0.6), ...at("budgets", 0.5, 0.35), s: 1.4 },
  { at: F(MARK.goals.t - 1.4), ...at("budgets", 0.5, 0.45), s: 1.4 },
  { at: F(MARK.goals.t - 0.4), ...WIDE, ry: 4 },
  { at: F(MARK.goals.t + 0.6), ...at("goals", 0.5, 0.5), s: 1.5 },
  { at: F(MARK.investments.t - 1.4), ...at("goals", 0.4, 0.5), s: 1.5 },
  { at: F(MARK.investments.t - 0.4), ...WIDE, ry: -4 },
  { at: F(MARK.investments.t + 0.5), ...at("investments", 0.5, 0.55), s: 1.85 },
  { at: F(MARK.sp500.t - 1.8), ...at("investments", 0.8, 0.6), s: 1.85 },
  { at: F(MARK.sp500.t - 0.5), ...WIDE, s: 1.1 },
  { at: F(MARK.sp500.t + 0.5), ...at("sp500", 0.5, 0.5), s: 1.45 },
  { at: F(MARK.dollar.t - 1.5), ...at("sp500", 0.7, 0.5), s: 1.45 },
  { at: F(MARK.dollar.t - 0.4), ...WIDE, s: 1.1 },
  { at: F(MARK.dollar.t + 0.6), ...at("dollar", 0.5, 0.45), s: 1.3 },
  { at: F(END - 0.8), ...at("dollar", 0.6, 0.45), s: 1.3 },
  { at: F(END), ...WIDE, s: 0.9, rx: 8, ry: 6 },
];

// Etiqueta de cada paso (abajo al centro): los capitulos de chapters.js.
function Label({ frame }) {
  return CHAPTERS.map((chapter, i) => {
    const from = F(chapter.from);
    const to = i + 1 < CHAPTERS.length ? F(CHAPTERS[i + 1].from) : F(END);
    if (frame < from - 2 || frame > to + 2) return null;
    const t = progress(frame, from, 20, easeOutExpo) * (1 - progress(frame, to - 14, 14, easeInOut));
    return (
      <div key={chapter.title} style={{ position: "absolute", left: 0, right: 0, bottom: 44, display: "flex", justifyContent: "center", opacity: t, transform: `translateY(${(1 - t) * 18}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 28px 14px 18px", borderRadius: 999, background: "rgba(18,19,21,0.9)", border: `1px solid ${C.borderStrong}`, boxShadow: "0 24px 60px rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }}>
          <span style={{ display: "grid", placeItems: "center", width: 34, height: 34, borderRadius: 17, background: C.fg, color: C.bg, fontFamily: MONO, fontSize: 17, fontWeight: 600 }}>{i + 1}</span>
          <span style={{ fontFamily: SANS, fontSize: 30, fontWeight: 500, letterSpacing: -0.6, color: C.fg }}>{chapter.title}</span>
        </div>
      </div>
    );
  });
}

function Window() {
  return (
    <div style={{ position: "absolute", left: OX, top: OY, width: WIN_W, height: WIN_H + BAR, borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 70px 160px -40px rgba(0,0,0,0.95)", background: C.card }}>
      <div style={{ height: BAR, display: "flex", alignItems: "center", gap: 8, padding: "0 16px", background: "#0e0f11", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {[0, 1, 2].map((i) => <span key={i} style={{ width: 11, height: 11, borderRadius: 6, background: "rgba(255,255,255,0.13)" }} />)}
        <span style={{ margin: "0 auto", padding: "3px 44px", borderRadius: 6, background: "rgba(255,255,255,0.045)", fontFamily: MONO, fontSize: 13, color: C.text4 }}>bolsillox.com.ar</span>
        <span style={{ width: 49 }} />
      </div>
      <Sequence from={F(START)} layout="none">
        <OffthreadVideo src={staticFile("tutorial-recording.mp4")} startFrom={Math.round(START * FPS)} playbackRate={RATE} style={{ width: WIN_W, height: WIN_H, display: "block" }} muted />
      </Sequence>
    </div>
  );
}

// Portada y cierre: logo y una frase, sobre el fondo de la landing.
function Card({ frame, from, to, title, text }) {
  const t = progress(frame, from, 30, easeOutExpo) * (1 - progress(frame, to - 18, 18, easeInOut));
  if (t <= 0) return null;
  return (
    <AbsoluteFill style={{ display: "grid", placeItems: "center", opacity: t }}>
      <div style={{ display: "grid", justifyItems: "center", gap: 30, transform: `translateY(${(1 - t) * 24}px)` }}>
        <Wordmark size={1.1} />
        <div style={{ fontFamily: SANS, fontSize: 40, fontWeight: 500, letterSpacing: -1.2, color: C.fg }}>{title}</div>
        {text && <div style={{ fontFamily: MONO, fontSize: 24, color: C.text3 }}>{text}</div>}
      </div>
    </AbsoluteFill>
  );
}

export function Tutorial() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const appStart = F(START);
  const appEnd = F(END);
  // La ventana entra despues de la portada y se va antes del cierre.
  const show = progress(frame, appStart - 30, 40, easeOutExpo) * (1 - progress(frame, appEnd, 30, easeInOut));
  const fade = progress(frame, 0, 18) * (1 - progress(frame, durationInFrames - 24, 24));
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Fonts />
      <AbsoluteFill style={{ opacity: fade }}>
        <Background shift={Math.sin(frame / 240)} />
        <AbsoluteFill style={{ opacity: show, transform: `translateY(${(1 - show) * 60}px)` }}>
          <Camera frame={frame} keys={CAMERA}>
            <Window />
          </Camera>
        </AbsoluteFill>
        <Label frame={frame} />
        <Card frame={frame} from={0} to={appStart + 6} title="Cómo usar bolsillox" />
        <Card frame={frame} from={appEnd + 10} to={durationInFrames + 30} title="Empezá gratis" text="bolsillox.com.ar" />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
