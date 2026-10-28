// Renderiza el tutorial (o cuadros sueltos para revisar) con el Chromium del sistema.
// node render.mjs            -> out/tutorial.mp4
// node render.mjs still 300  -> out/still-300.png
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";

const browserExecutable = process.env.REMOTION_BROWSER || "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.jsx") });
const composition = await selectComposition({ serveUrl, id: "Tutorial", browserExecutable });
const [mode, ...frames] = process.argv.slice(2);

if (mode === "still") {
  for (const frame of frames.map(Number)) {
    await renderStill({ composition, serveUrl, frame, output: `out/still-${frame}.png`, browserExecutable, scale: 0.5 });
    console.log("cuadro", frame);
  }
} else {
  await renderMedia({ composition, serveUrl, browserExecutable, concurrency: 4, codec: "h264", crf: 16, outputLocation: "out/tutorial.mp4", pixelFormat: "yuv420p" });
  console.log("mp4 listo");
  // Segundos de cada capitulo, para CHAPTERS en src/pages/Tutorial.jsx de la app.
  const { timeline, videoSecond } = await import("./src/chapters.js");
  const { chapters } = timeline(JSON.parse(fs.readFileSync("public/tutorial-marks.json", "utf8")));
  console.log("capitulos:", chapters.map((chapter) => +videoSecond(chapter.from).toFixed(2)).join(", "));
}
