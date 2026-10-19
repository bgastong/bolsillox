/*
Texturas del billete de la pagina de inicio, dibujadas con canvas (sin
imagenes): frente, dorso, una mascara PBR para la banda holografica y el "$"
metalico, y un mapa de normales que deja la tinta del grabado en relieve.
Es un diseño propio de bolsillox, no la copia de un billete real.
*/

// Tamaño base del billete en pixeles (proporcion 2,35 : 1).
const BASE_W = 2048;
const BASE_H = 872;

const INK = "#123222";
const INK_2 = "#22523a";
const PAPER_1 = "#d9dfca";
const PAPER_2 = "#bcc8ad";
// Banda holografica (x en el frente, en pixeles base).
const STRIP = [1372, 1446];

// Pseudoaleatorio con semilla: el billete sale siempre igual.
function seeded(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function makeCanvas(scale) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(BASE_W * scale);
  canvas.height = Math.round(BASE_H * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.scale(scale, scale);
  return { canvas, ctx };
}

function rosette(c, cx, cy, radius, amp, lobes, lines, color, alpha) {
  c.save();
  c.strokeStyle = color;
  c.globalAlpha = alpha;
  c.lineWidth = 1.2;
  for (let k = 0; k < lines; k++) {
    const phase = (k / lines) * Math.PI * 2;
    c.beginPath();
    for (let i = 0; i <= 720; i++) {
      const t = (i / 720) * Math.PI * 2;
      const r = radius + amp * Math.sin(lobes * t + phase) + amp * 0.35 * Math.sin((2 * lobes + 1) * t);
      const x = cx + r * Math.cos(t);
      const y = cy + r * Math.sin(t);
      if (i) c.lineTo(x, y);
      else c.moveTo(x, y);
    }
    c.stroke();
  }
  c.restore();
}

function waves(c, step, color, alpha) {
  c.save();
  c.beginPath();
  c.rect(70, 70, BASE_W - 140, BASE_H - 140);
  c.clip();
  c.strokeStyle = color;
  c.globalAlpha = alpha;
  for (let y = 50; y < BASE_H; y += step) {
    c.beginPath();
    for (let x = 70; x <= BASE_W - 70; x += 4) {
      const yy = y + 6 * Math.sin(x / 34 + y / 23) + 3 * Math.sin(x / 11 - y / 40);
      if (x === 70) c.moveTo(x, yy);
      else c.lineTo(x, yy);
    }
    c.stroke();
  }
  c.restore();
}

function paper(c, rand) {
  const g = c.createLinearGradient(0, 0, BASE_W, BASE_H);
  g.addColorStop(0, PAPER_1);
  g.addColorStop(1, PAPER_2);
  c.fillStyle = g;
  c.fillRect(0, 0, BASE_W, BASE_H);

  const vignette = c.createRadialGradient(BASE_W / 2, BASE_H / 2, BASE_H * 0.3, BASE_W / 2, BASE_H / 2, BASE_W * 0.62);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(60,70,40,.18)");
  c.fillStyle = vignette;
  c.fillRect(0, 0, BASE_W, BASE_H);

  // Fibras de seguridad rojas y azules
  for (let i = 0; i < 1100; i++) {
    const x = rand() * BASE_W;
    const y = rand() * BASE_H;
    const a = rand() * Math.PI;
    const l = 6 + rand() * 14;
    c.strokeStyle = rand() < 0.5 ? "rgba(178,38,52,.4)" : "rgba(36,66,170,.4)";
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 3, y + Math.sin(a) * l * 0.5 - 3, x + Math.cos(a) * l, y + Math.sin(a) * l);
    c.stroke();
  }
}

function frame(c) {
  const W = BASE_W;
  const H = BASE_H;
  c.save();
  c.strokeStyle = INK;
  c.lineWidth = 5;
  c.strokeRect(34, 34, W - 68, H - 68);
  c.lineWidth = 2;
  c.strokeRect(70, 70, W - 140, H - 140);

  // Banda guilloche entre los dos marcos
  c.beginPath();
  c.rect(36, 36, W - 72, H - 72);
  c.rect(70, 70, W - 140, H - 140);
  c.clip("evenodd");
  c.lineWidth = 1;
  c.globalAlpha = 0.75;
  const perimeter = 2 * (W + H);
  for (let p = 0; p < 4; p++) {
    c.beginPath();
    for (let i = 0; i <= 1400; i++) {
      const s = (i / 1400) * perimeter;
      let x;
      let y;
      if (s < W) [x, y] = [s, 52];
      else if (s < W + H) [x, y] = [W - 52, s - W];
      else if (s < 2 * W + H) [x, y] = [W - (s - W - H), H - 52];
      else [x, y] = [52, H - (s - 2 * W - H)];
      const offset = 13 * Math.sin(s / 9 + (p * Math.PI) / 2);
      if (y === 52 || y === H - 52) y += offset;
      else x += offset;
      if (i) c.lineTo(x, y);
      else c.moveTo(x, y);
    }
    c.stroke();
  }
  c.restore();
}

// Texto con relleno tramado, como tinta de grabado.
function hatch(c, text, x, y, size) {
  const font = `700 ${size}px Georgia, serif`;
  c.save();
  c.font = font;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = INK;
  c.globalAlpha = 0.3;
  c.fillText(text, x, y);
  c.globalAlpha = 1;

  const w = Math.ceil(c.measureText(text).width + 40);
  const h = Math.ceil(size * 1.1);
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const o = off.getContext("2d");
  o.font = font;
  o.textAlign = "center";
  o.textBaseline = "middle";
  o.fillText(text, w / 2, h / 2);
  o.globalCompositeOperation = "source-in";
  o.strokeStyle = INK;
  o.lineWidth = 2.2;
  for (let yy = 0; yy < h; yy += 4.5) {
    o.beginPath();
    o.moveTo(0, yy);
    o.lineTo(w, yy);
    o.stroke();
  }
  c.drawImage(off, x - w / 2, y - h / 2);
  c.strokeStyle = INK;
  c.lineWidth = 2.5;
  c.strokeText(text, x, y);
  c.restore();
}

function corner(c, x, y) {
  rosette(c, x, y, 70, 10, 12, 10, INK, 0.55);
  c.save();
  c.fillStyle = PAPER_1;
  c.beginPath();
  c.arc(x, y, 54, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = INK;
  c.font = "700 120px Georgia, serif";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText("1", x, y + 6);
  c.restore();
}

function spaced(c, text, x, y, font, color = INK) {
  c.save();
  c.fillStyle = color;
  c.font = font;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(text.split("").join(" "), x, y);
  c.restore();
}

function seal(c, x, y, r, color, label) {
  c.save();
  c.translate(x, y);
  c.fillStyle = color;
  c.beginPath();
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const rr = i % 2 ? r : r * 0.9;
    c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  c.fill();
  c.strokeStyle = PAPER_1;
  c.lineWidth = 2;
  c.beginPath();
  c.arc(0, 0, r * 0.72, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = PAPER_1;
  c.font = `700 ${r * 0.7}px Georgia, serif`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(label, 0, 4);
  c.restore();
}

function hologramStrip(c, x0, x1) {
  const g = c.createLinearGradient(0, 0, 0, BASE_H);
  ["#b9c6c1", "#eef5f2", "#a9b8b2", "#e3ece8", "#b4c2bc"].forEach((stop, i) => g.addColorStop(i / 4, stop));
  c.save();
  c.fillStyle = g;
  c.fillRect(x0, 0, x1 - x0, BASE_H);
  c.fillStyle = "rgba(20,56,38,.55)";
  c.font = "700 26px Georgia, serif";
  c.textAlign = "center";
  for (let y = 30; y < BASE_H; y += 46) c.fillText(y % 92 < 46 ? "$" : "BX", (x0 + x1) / 2, y);
  c.restore();
}

function drawFront(scale, rand) {
  const { canvas, ctx: c } = makeCanvas(scale);
  const cx = BASE_W / 2;
  const cy = BASE_H / 2 + 10;
  paper(c, rand);
  waves(c, 7, INK_2, 0.15);
  frame(c);
  rosette(c, cx, cy, 300, 26, 18, 26, INK, 0.4);
  rosette(c, cx, cy, 240, 14, 30, 16, INK_2, 0.48);

  c.save();
  const medal = c.createRadialGradient(cx, cy, 20, cx, cy, 215);
  medal.addColorStop(0, "#e6ebdb");
  medal.addColorStop(1, "#c9d4bc");
  c.fillStyle = medal;
  c.beginPath();
  c.ellipse(cx, cy, 190, 215, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 4;
  c.stroke();
  c.lineWidth = 1.5;
  c.beginPath();
  c.ellipse(cx, cy, 176, 201, 0, 0, Math.PI * 2);
  c.stroke();
  c.restore();

  hatch(c, "$", cx, cy + 8, 330);
  spaced(c, "BOLSILLOX", cx, 128, "700 60px Georgia, serif");
  spaced(c, "reserva digital de valor", cx, 178, "italic 28px Georgia, serif", INK_2);
  spaced(c, "UN DÓLAR", cx, BASE_H - 128, "700 54px Georgia, serif");
  seal(c, 470, BASE_H / 2 + 40, 92, "#24507a", "B");

  c.save();
  c.fillStyle = "#2a6145";
  c.font = '600 36px "Courier New", monospace';
  c.fillText("BX 20261019 A", 250, 262);
  c.restore();

  hologramStrip(c, STRIP[0], STRIP[1]);
  corner(c, 175, 175);
  corner(c, BASE_W - 175, 175);
  corner(c, 175, BASE_H - 175);
  corner(c, BASE_W - 175, BASE_H - 175);
  return canvas;
}

function drawBack(scale, rand) {
  const { canvas, ctx: c } = makeCanvas(scale);
  paper(c, rand);
  c.fillStyle = "rgba(38,104,66,.24)";
  c.fillRect(70, 70, BASE_W - 140, BASE_H - 140);
  waves(c, 5, INK, 0.22);
  frame(c);
  rosette(c, 560, BASE_H / 2, 250, 30, 14, 30, INK, 0.45);
  hatch(c, "$", 560, BASE_H / 2 + 6, 220);
  rosette(c, BASE_W - 480, BASE_H / 2, 260, 22, 10, 22, INK_2, 0.38);
  hatch(c, "1", BASE_W - 480, BASE_H / 2 + 10, 440);
  spaced(c, "BOLSILLOX", BASE_W / 2 + 60, 160, "700 50px Georgia, serif");
  spaced(c, "tu plata, en tu bolsillo", BASE_W / 2 + 60, BASE_H - 140, "italic 32px Georgia, serif", INK_2);
  // La banda atraviesa el papel: en el dorso aparece espejada.
  hologramStrip(c, BASE_W - STRIP[1], BASE_W - STRIP[0]);
  corner(c, 175, 175);
  corner(c, BASE_W - 175, BASE_H - 175);
  return canvas;
}

// Mascara PBR: R = iridiscencia, G = rugosidad, B = metal.
function drawMask(scale, paintFoil) {
  const { canvas, ctx } = makeCanvas(scale);
  ctx.fillStyle = "rgb(0,225,0)";
  ctx.fillRect(0, 0, BASE_W, BASE_H);
  ctx.fillStyle = "rgb(255,60,255)";
  paintFoil(ctx);
  return canvas;
}

// Mapa de normales a partir del brillo: lo oscuro (la tinta) queda en relieve.
function normalMapFrom(source, strength = 2.6) {
  const W = source.width;
  const H = source.height;
  const data = source.getContext("2d").getImageData(0, 0, W, H).data;
  const height = new Float32Array(W * H);
  for (let i = 0, j = 0; i < height.length; i++, j += 4) {
    height[i] = 1 - (data[j] * 0.299 + data[j + 1] * 0.587 + data[j + 2] * 0.114) / 255;
  }
  const out = new ImageData(W, H);
  const o = out.data;
  for (let y = 0; y < H; y++) {
    const up = y ? y - 1 : y;
    const down = y < H - 1 ? y + 1 : y;
    for (let x = 0; x < W; x++) {
      const left = x ? x - 1 : x;
      const right = x < W - 1 ? x + 1 : x;
      const nx = -(height[y * W + right] - height[y * W + left]) * strength;
      const ny = (height[down * W + x] - height[up * W + x]) * strength;
      const len = Math.hypot(nx, ny, 1);
      const k = (y * W + x) * 4;
      o[k] = (nx / len * 0.5 + 0.5) * 255;
      o[k + 1] = (ny / len * 0.5 + 0.5) * 255;
      o[k + 2] = (1 / len * 0.5 + 0.5) * 255;
      o[k + 3] = 255;
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  canvas.getContext("2d").putImageData(out, 0, 0);
  return canvas;
}

/*
Devuelve los canvas del billete. scale < 1 en el celular: texturas mas
livianas (menos memoria de video y menos tiempo de armado).
*/
export function createBillTextures(scale = 1) {
  const rand = seeded(7);
  const front = drawFront(scale, rand);
  const back = drawBack(scale, rand);
  const frontMask = drawMask(scale, (ctx) => {
    ctx.fillRect(STRIP[0], 0, STRIP[1] - STRIP[0], BASE_H);
    ctx.font = "700 330px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", BASE_W / 2, BASE_H / 2 + 18);
  });
  const backMask = drawMask(scale, (ctx) => {
    ctx.fillRect(BASE_W - STRIP[1], 0, STRIP[1] - STRIP[0], BASE_H);
  });
  return {
    front,
    back,
    frontMask,
    backMask,
    frontNormal: normalMapFrom(front),
    backNormal: normalMapFrom(back),
  };
}

export const BILL_ASPECT = BASE_W / BASE_H;
