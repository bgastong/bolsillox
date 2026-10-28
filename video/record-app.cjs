/*
Graba la app en tamaño celular para el video de la landing (ver README.md).
Usa la captura de pantalla de Chrome a 3x (1170x2532) y arma
public/app-recording.mp4. Hace falta la app corriendo (npm run dev) con la
cuenta de ejemplo (demo@bolsillox.app). El gasto que carga se borra al final.

  NODE_PATH=$(npm root -g) node record-app.cjs   (Playwright instalado global)
  APP_URL=http://localhost:5173 para usar otra direccion.
*/
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const APP = process.env.APP_URL || 'http://localhost:5173';
(async () => {
  const b = await chromium.launch();
  const W = 390, H = 844, DPR = 3;
  let c = await b.newContext({ viewport: { width: W, height: H } });
  let p = await c.newPage();
  await p.goto(APP + '/login');
  await p.getByLabel('Email').fill('demo@bolsillox.app');
  await p.getByLabel('Contraseña', { exact: true }).fill('demo1234');
  await p.getByRole('button', { name: 'Iniciar sesión' }).click();
  await p.waitForURL((u) => u.pathname === '/');
  await p.evaluate(async () => { for (const m of await fetch('/api/movements?q=Supermercado%20Coto').then((r) => r.json())) await fetch(`/api/movements/${m.id}`, { method: 'DELETE' }); });
  const state = await c.storageState();
  await c.close();

  c = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, isMobile: true, hasTouch: true, storageState: state });
  await c.addInitScript(() => { try { localStorage.setItem('bolsillox.theme', 'dark'); localStorage.setItem('bolsillox.cashflowRange', '6m'); sessionStorage.setItem('bolsillox.splashSeen', '1'); } catch {} });
  // Datos prolijos para el video (sin tocar la base):
  await c.route('**/api/summary**', async (route) => { const r = await route.fetch(); const j = await r.json(); j.hasDemoData = false; await route.fulfill({ response: r, json: j }); });
  await c.route('**/api/rates', async (route) => {
    const now = new Date().toISOString();
    await route.fulfill({ json: { source: 'blue', manualRate: null, rate: 1290, rates: { oficial: { buy: 1150, sell: 1190, updatedAt: now }, blue: { buy: 1270, sell: 1290, updatedAt: now }, mep: { buy: 1250, sell: 1265, updatedAt: now } }, fetchedAt: now, stale: false, error: null } });
  });
  await c.route('**/api/budgets**', async (route) => {
    const r = await route.fetch(); const j = await r.json();
    if (Array.isArray(j.items)) {
      for (const it of j.items) if (it.percent > 80) { it.amount = Math.ceil(it.spent / 0.68 / 1000) * 1000; it.percent = (it.spent / it.amount) * 100; it.remaining = it.amount - it.spent; it.status = 'ok'; }
      if (j.totals) { j.totals.amount = j.items.reduce((s, i) => s + i.amount, 0); j.totals.percent = (j.totals.spent / j.totals.amount) * 100; }
    }
    await route.fulfill({ response: r, json: j });
  });
  p = await c.newPage();
  // Precalienta las pantallas (asi no se ven cargando en el video).
  for (const route of ['/investments', '/goals', '/budgets', '/']) {
    await p.goto(APP + route);
    await p.waitForTimeout(1800);
  }
  await p.waitForTimeout(800);

  // Captura de pantalla de Chrome: cuadros a la resolucion real (1170x2532).
  const dir = 'frames'; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  const cdp = await c.newCDPSession(p);
  const frames = [];
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const file = path.join(dir, `${String(frames.length).padStart(5, '0')}.jpg`);
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
    frames.push({ file, t: metadata.timestamp });
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W * DPR, maxHeight: H * DPR, everyNthFrame: 1 });
  const t0 = Date.now() / 1000;
  const log = {};
  const mark = (name) => { log[name] = Date.now() / 1000 - t0; };
  const scrollToY = (y, ms = 1000) => p.evaluate(([y, ms]) => new Promise((done) => {
    const start = scrollY, t = performance.now();
    const step = (now) => { const k = Math.min(1, (now - t) / ms); const e = k < .5 ? 4*k*k*k : 1 - Math.pow(-2*k+2, 3)/2; scrollTo(0, start + (y - start) * e); k < 1 ? requestAnimationFrame(step) : done(); };
    requestAnimationFrame(step);
  }), [y, ms]);
  const topOf = (sel, off = 64) => p.locator(sel).first().evaluate((el, off) => el.getBoundingClientRect().top + scrollY - off, off);

  mark('home');
  await p.waitForTimeout(1300);
  // 1. Cargar un gasto
  await p.getByRole('button', { name: 'Nuevo movimiento' }).tap(); mark('form');
  await p.waitForTimeout(550);
  const d = p.getByRole('dialog');
  await d.locator('#movement-title').tap();
  await p.keyboard.type('Supermercado Coto', { delay: 55 });
  await d.locator('#movement-amount').tap(); mark('amount');
  await p.keyboard.type('48250', { delay: 140 });
  await p.waitForTimeout(250);
  await d.getByRole('radio', { name: 'Comida' }).tap();
  await p.waitForTimeout(250);
  await d.locator('#movement-paymentMethod').tap(); await p.waitForTimeout(350);
  await p.getByRole('option', { name: 'Débito' }).tap();
  await p.waitForTimeout(300);
  await d.getByRole('button', { name: 'Guardar' }).tap(); mark('saved');
  await p.waitForTimeout(1500);
  // 2. Flujo de caja: cambia de periodo
  await scrollToY(await topOf('[aria-labelledby="cashflow-title"]'), 1100); mark('cashflow');
  await p.waitForTimeout(900);
  const cf = p.locator('[aria-labelledby="cashflow-title"]');
  await cf.getByRole('radio', { name: '1A' }).tap(); await p.waitForTimeout(1300);
  await cf.getByRole('radio', { name: '1M' }).tap(); await p.waitForTimeout(1300);
  // 3. Torta
  await scrollToY(await topOf('[aria-labelledby="categories-title"]'), 1000); mark('pie');
  await p.waitForTimeout(1700);
  // 4. Metas
  await scrollToY(0, 500);
  await p.getByRole('link', { name: 'Presupuestos' }).last().tap();
  await p.waitForTimeout(700);
  await p.getByRole('link', { name: 'Metas' }).first().tap(); mark('goals');
  await p.waitForTimeout(1500);
  await scrollToY(260, 900);
  await p.waitForTimeout(900);
  // 5. Inversiones
  await scrollToY(0, 400);
  await p.getByRole('link', { name: 'Inversiones' }).first().tap(); mark('invest');
  await p.waitForTimeout(800);
  await scrollToY(230, 900);
  await p.waitForTimeout(1300);
  await scrollToY(await topOf('[aria-labelledby="market-sp500"]'), 1100);
  await p.waitForTimeout(1500);
  await scrollToY(await topOf('[aria-labelledby="dollar-history"]'), 1100); mark('dollar');
  await p.waitForTimeout(2200);
  mark('end');
  await cdp.send('Page.stopScreencast');
  await p.waitForTimeout(300);
  // Duracion de cada cuadro (hasta el siguiente) para armar el video.
  const lines = ['ffconcat version 1.0'];
  frames.forEach((f, i) => {
    const next = frames[i + 1]?.t ?? f.t + 0.05;
    lines.push(`file '${path.basename(f.file)}'`, `duration ${Math.max(0.001, next - f.t).toFixed(4)}`);
  });
  lines.push(`file '${path.basename(frames.at(-1).file)}'`);
  fs.writeFileSync(path.join(dir, 'list.txt'), lines.join('\n'));
  log.firstFrame = frames[0].t; log.count = frames.length; log.span = frames.at(-1).t - frames[0].t;
  fs.writeFileSync(path.join(dir, 'marks.json'), JSON.stringify(log, null, 2));
  await c.close();
  c = await b.newContext({ storageState: state }); p = await c.newPage();
  await p.goto(APP + '/');
  await p.evaluate(async () => { for (const m of await fetch('/api/movements?q=Supermercado%20Coto').then((r) => r.json())) await fetch(`/api/movements/${m.id}`, { method: 'DELETE' }); });
  await b.close();
  // Cuadros -> video a 60 cuadros por segundo, casi sin perdida.
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt'),
    '-vf', 'fps=60,scale=1170:2532:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', 'public/app-recording.mp4']);
  console.log('Momentos de la grabacion (segundos):', JSON.stringify(log));
})();
