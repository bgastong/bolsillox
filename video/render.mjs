// Renderiza el video (o cuadros sueltos para revisar) con el Chromium del sistema.
// node render.mjs            -> out/landing.mp4 y out/landing.webm
// node render.mjs still 300  -> out/still-300.png
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";

const browserExecutable = process.env.REMOTION_BROWSER || "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.jsx") });
const composition = await selectComposition({ serveUrl, id: "Landing", browserExecutable });
const [mode, ...frames] = process.argv.slice(2);

if (mode === "still") {
  for (const frame of frames.map(Number)) {
    await renderStill({ composition, serveUrl, frame, output: `out/still-${frame}.png`, browserExecutable, scale: 0.5 });
    console.log("cuadro", frame);
  }
} else {
  const common = { composition, serveUrl, browserExecutable, concurrency: 4 };
  await renderMedia({ ...common, codec: "h264", crf: 26, outputLocation: "out/landing.mp4", pixelFormat: "yuv420p" });
  console.log("mp4 listo");
}
