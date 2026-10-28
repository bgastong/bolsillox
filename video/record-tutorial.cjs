/*
Graba el recorrido de la app en la compu para el video del tutorial (ver
README.md). Usa la captura de pantalla de Chrome a 2x (2880x1800) y arma
public/tutorial-recording.mp4 y public/tutorial-marks.json: en que segundo pasa
cada cosa y donde esta en pantalla, para que la camara del video sepa a donde ir.
Hace falta la app corriendo (npm run dev) con la cuenta de ejemplo
(demo@bolsillox.app). El gasto que carga se borra al final.

  NODE_PATH=$(npm root -g) node record-tutorial.cjs   (Playwright instalado global)
  APP_URL=http://localhost:5173 para usar otra direccion.
*/
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const APP = process.env.APP_URL || 'http://localhost:5173';
const W = 1440, H = 900, DPR = 2;
const TITLE = 'Supermercado Coto';

// Cursor visible (la captura no muestra el puntero) con un anillo al hacer clic.
function cursorScript() {
  window.addEventListener('DOMContentLoaded', () => {
    const c = document.createElement('div');
    c.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M4 2 L4 20 L9 15.5 L12.5 22 L15.5 20.6 L12.2 14.2 L19 14.2 Z" fill="#fff" stroke="#000" stroke-width="1.3" stroke-linejoin="round"/></svg>';
    Object.assign(c.style, { position: 'fixed', left: '0', top: '0', zIndex: 2147483647, pointerEvents: 'none', transform: 'translate(-100px,-100px)', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,.5))', transition: 'scale .08s' });
    document.documentElement.appendChild(c);
    addEventListener('mousemove', (e) => { c.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 2}px)`; }, true);
    addEventListener('mousedown', (e) => {
      c.style.scale = '0.85';
      const r = document.createElement('div');
      Object.assign(r.style, { position: 'fixed', left: e.clientX - 20 + 'px', top: e.clientY - 20 + 'px', width: '40px', height: '40px', borderRadius: '50%', border: '2px solid rgba(255,255,255,.8)', zIndex: 2147483646, pointerEvents: 'none', transition: 'transform .45s cubic-bezier(.16,1,.3,1), opacity .45s' });
      document.documentElement.appendChild(r);
      requestAnimationFrame(() => { r.style.transform = 'scale(1.8)'; r.style.opacity = '0'; });
      setTimeout(() => r.remove(), 600);
    }, true);
    addEventListener('mouseup', () => { c.style.scale = '1'; }, true);
  });
}

async function removeTest(p) {
  await p.evaluate(async (title) => {
    for (const m of await fetch(`/api/movements?q=${encodeURIComponent(title)}`).then((r) => r.json())) await fetch(`/api/movements/${m.id}`, { method: 'DELETE' });
  }, TITLE);
}

(async () => {
  const b = await chromium.launch();
  let c = await b.newContext({ viewport: { width: W, height: H } });
  let p = await c.newPage();
  await p.goto(APP + '/login');
  await p.getByLabel('Email').fill('demo@bolsillox.app');
  await p.getByLabel('Contraseña', { exact: true }).fill('demo1234');
  await p.getByRole('button', { name: 'Iniciar sesión' }).click();
  await p.waitForURL((u) => u.pathname === '/');
  await removeTest(p);
  const state = await c.storageState();
  await c.close();

  c = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, storageState: state });
  await c.addInitScript(() => { try { localStorage.setItem('bolsillox.theme', 'dark'); localStorage.setItem('bolsillox.cashflowRange', '6m'); sessionStorage.setItem('bolsillox.splashSeen', '1'); } catch {} });
  await c.addInitScript(cursorScript);
  // Datos prolijos para el video (sin tocar la base): sin el aviso de datos de
  // ejemplo, cotizacion fija y sin presupuestos excedidos.
  await c.route('**/api/summary**', async (route) => { const r = await route.fetch(); const j = await r.json(); j.hasDemoData = false; await route.fulfill({ response: r, json: j }); });
  await c.route('**/api/rates', async (route) => {
    const now = new Date().toISOString();
    await route.fulfill({ json: { source: 'blue', manualRate: null, rate: 1290, rates: { oficial: { buy: 1150, sell: 1190, updatedAt: now }, blue: { buy: 1270, sell: 1290, updatedAt: now }, mep: { buy: 1250, sell: 1265, updatedAt: now } }, fetchedAt: now, stale: false, error: null } });
  });
  // Las respuestas arregladas se guardan la primera vez: si no, la pantalla se
  // ve cargando mientras se piden de nuevo.
  const cached = new Map();
  await c.route('**/api/budgets**', async (route) => {
    const key = route.request().url();
    if (route.request().method() === 'GET' && cached.has(key)) return route.fulfill({ json: cached.get(key) });
    const r = await route.fetch(); const j = await r.json();
    if (Array.isArray(j.items)) {
      for (const it of j.items) if (it.percent > 80) { it.amount = Math.ceil(it.spent / 0.68 / 1000) * 1000; it.percent = (it.spent / it.amount) * 100; it.remaining = it.amount - it.spent; it.status = 'ok'; }
      if (j.totals) { j.totals.amount = j.items.reduce((s, i) => s + i.amount, 0); j.totals.percent = (j.totals.spent / j.totals.amount) * 100; }
    }
    if (route.request().method() === 'GET') cached.set(key, j);
    await route.fulfill({ response: r, json: j });
  });
  p = await c.newPage();
  // Al guardar un movimiento se vuelven a pedir (el gasto cuenta en el presupuesto).
  p.on('requestfinished', (request) => { if (request.method() !== 'GET' && request.url().includes('/api/movements')) cached.clear(); });
  // Precalienta las pantallas (asi no se ven cargando en el video).
  for (const route of ['/investments', '/goals', '/budgets', '/']) {
    await p.goto(APP + route);
    await p.waitForTimeout(2000);
  }
  await p.mouse.move(W * 0.72, H * 0.62);
  await p.waitForTimeout(800);

  // Captura de pantalla de Chrome a la resolucion real.
  const dir = 'frames'; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  const cdp = await c.newCDPSession(p);
  const frames = [];
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const file = path.join(dir, `${String(frames.length).padStart(5, '0')}.jpg`);
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
    frames.push({ file, t: metadata.timestamp });
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: W * DPR, maxHeight: H * DPR, everyNthFrame: 1 });

  // Momentos: segundo (reloj de la captura) + caja del elemento en pantalla.
  const marks = [];
  const mark = async (name, locator) => {
    const box = locator ? await locator.boundingBox() : null;
    marks.push({ name, t: Date.now() / 1000, box: box && { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.width), h: Math.round(box.height) } });
    return box;
  };
  const moveTo = async (locator, { steps = 26, fx = 0.5, fy = 0.5 } = {}) => {
    const r = await locator.boundingBox();
    await p.mouse.move(r.x + r.width * fx, r.y + r.height * fy, { steps });
  };
  const click = async (locator, opts) => { await moveTo(locator, opts); await locator.click(); };
  const scrollToY = (y, ms = 1000) => p.evaluate(([y, ms]) => new Promise((done) => {
    const start = scrollY, t = performance.now();
    const step = (now) => { const k = Math.min(1, (now - t) / ms); const e = k < .5 ? 4*k*k*k : 1 - Math.pow(-2*k+2, 3)/2; scrollTo(0, start + (y - start) * e); k < 1 ? requestAnimationFrame(step) : done(); };
    requestAnimationFrame(step);
  }), [y, ms]);
  const topOf = (locator, off = 80) => locator.evaluate((el, off) => el.getBoundingClientRect().top + scrollY - off, off);
  // Pasa el mouse de izquierda a derecha por un grafico.
  const sweep = async (locator, { from = 0.12, to = 0.94, fy = 0.6, steps = 70 } = {}) => {
    const r = await locator.boundingBox();
    await p.mouse.move(r.x + r.width * from, r.y + r.height * fy, { steps: 18 });
    await p.mouse.move(r.x + r.width * to, r.y + r.height * fy, { steps });
  };
  const wait = (ms) => p.waitForTimeout(ms);
  const sidebar = (name) => p.locator('[data-sidebar="sidebar"]').getByRole('link', { name, exact: true }).first();

  await wait(400);
  await mark('start', p.locator('main'));
  await wait(1400);

  // 1. Cargar un gasto
  const newBtn = p.getByRole('button', { name: /Nuevo movimiento/ }).first();
  await moveTo(newBtn);
  await mark('newBtn', newBtn);
  await newBtn.click();
  await wait(600);
  const d = p.getByRole('dialog');
  const title = d.locator('#movement-title');
  await moveTo(title);
  await title.click();
  await mark('title', title);
  await p.keyboard.type(TITLE, { delay: 65 });
  const amount = d.locator('#movement-amount');
  await moveTo(amount);
  await amount.click();
  await mark('amount', amount);
  await p.keyboard.type('48250', { delay: 160 });
  await wait(350);
  const chip = d.getByRole('radio', { name: 'Comida' });
  await mark('category', chip);
  await click(chip);
  await wait(300);
  const method = d.locator('#movement-paymentMethod');
  await mark('method', method);
  await click(method);
  await wait(350);
  await click(p.getByRole('option', { name: 'Débito' }), { steps: 12 });
  await wait(350);
  const save = d.getByRole('button', { name: 'Guardar' });
  await mark('save', save);
  await click(save);
  await wait(500);

  // 2. Saldo actualizado
  const balance = p.locator('section').filter({ hasText: 'Saldo disponible' }).first();
  await mark('balance', balance);
  await p.mouse.move(W * 0.5, H * 0.3, { steps: 20 });
  await wait(2200);

  // 3. Flujo de caja: recorre el grafico y cambia de periodo
  const cash = p.locator('[aria-labelledby="cashflow-title"]');
  await scrollToY(await topOf(cash), 1100);
  await wait(200);
  await mark('cashflow', cash);
  await sweep(cash, { from: 0.15, to: 0.95, fy: 0.62, steps: 90 });
  await wait(400);
  await click(cash.getByRole('radio', { name: '1A' }));
  await mark('cashflowYear', cash);
  await wait(1600);

  // 4. Gastos por categoria
  const cats = p.locator('[aria-labelledby="categories-title"]');
  await mark('categories', cats);
  await moveTo(cats, { fx: 0.42, fy: 0.42, steps: 30 });
  await wait(900);
  await moveTo(cats, { fx: 0.55, fy: 0.5, steps: 20 });
  await wait(1300);

  // 5. Presupuestos
  await scrollToY(0, 700);
  await click(sidebar('Presupuestos'));
  await wait(500);
  await mark('budgets', p.locator('[aria-labelledby="budgets-active"]'));
  await p.mouse.move(W * 0.6, H * 0.55, { steps: 30 });
  await wait(2200);

  // 6. Metas
  await click(sidebar('Metas'));
  await wait(500);
  await mark('goals', p.locator('[aria-labelledby="goals-active"]'));
  await moveTo(p.locator('[aria-labelledby="goal-2-name"]'), { fx: 0.5, fy: 0.45, steps: 30 });
  await wait(2400);

  // 7. Inversiones: tus inversiones, el S&P 500 y el dolar por gobierno
  await click(sidebar('Inversiones'));
  await wait(500);
  const firstInv = p.locator('[aria-labelledby="investment-7-name"]');
  await mark('investments', firstInv);
  await sweep(firstInv, { from: 0.1, to: 0.95, fy: 0.62, steps: 70 });
  await wait(700);
  const sp = p.locator('[aria-labelledby="market-sp500"]');
  await scrollToY(await topOf(sp), 1100);
  await wait(200);
  await mark('sp500', sp);
  await sweep(sp, { from: 0.1, to: 0.9, fy: 0.55, steps: 80 });
  await wait(500);
  const dollar = p.locator('[aria-labelledby="dollar-history"]');
  await scrollToY(await topOf(dollar), 1100);
  await wait(200);
  await mark('dollar', dollar);
  await sweep(dollar, { from: 0.1, to: 0.92, fy: 0.42, steps: 100 });
  await wait(1500);
  await mark('end');

  await cdp.send('Page.stopScreencast');
  await wait(300);
  // Duracion de cada cuadro (hasta el siguiente) para armar el video.
  const lines = ['ffconcat version 1.0'];
  frames.forEach((f, i) => {
    const next = frames[i + 1]?.t ?? f.t + 0.05;
    lines.push(`file '${path.basename(f.file)}'`, `duration ${Math.max(0.001, next - f.t).toFixed(4)}`);
  });
  lines.push(`file '${path.basename(frames.at(-1).file)}'`);
  fs.writeFileSync(path.join(dir, 'list.txt'), lines.join('\n'));
  const first = frames[0].t;
  const out = { viewport: { width: W, height: H }, frames: frames.length, seconds: +(frames.at(-1).t - first).toFixed(2), marks: marks.map((m) => ({ ...m, t: +(m.t - first).toFixed(2) })) };
  fs.writeFileSync('public/tutorial-marks.json', JSON.stringify(out, null, 2));
  await c.close();

  c = await b.newContext({ storageState: state }); p = await c.newPage();
  await p.goto(APP + '/');
  await removeTest(p);
  await b.close();
  // Cuadros -> video a 60 cuadros por segundo, casi sin perdida.
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt'),
    '-vf', `fps=60,scale=${W * DPR}:${H * DPR}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', 'public/tutorial-recording.mp4']);
  console.log(`${frames.length} cuadros en ${out.seconds} s`);
  console.log(out.marks.map((m) => `${m.name}@${m.t}`).join(' '));
})();
