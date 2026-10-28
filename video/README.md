# Video de la página de inicio

Video de bolsillox que se muestra en la landing («Mirá cómo funciona»). Está
hecho con [Remotion](https://www.remotion.dev): cada escena es un componente de
React y las animaciones se calculan cuadro por cuadro, por eso salen suaves.
No es parte de la app: tiene sus propias dependencias.

## Escenas (`src/scenes`)

1. `Brand.jsx` (inicio): logo y «Tu plata, clara.»
2. `Expense.jsx`: se carga un gasto; el saldo baja y el flujo de caja suma un tramo rojo.
3. `Pie.jsx`: gastos por categoría en una torta que entra girando.
4. `Cashflow.jsx`: el flujo de caja cambia de período y la línea se transforma.
5. `Goals.jsx`: metas de ahorro que se llenan; se aporta a una.
6. `Invest.jsx`: inversión al S&P 500 con las compras marcadas y el dólar por gobierno.
7. `Brand.jsx` (cierre): logo, «Crear cuenta gratis» y la web.

La duración de cada escena y la transición entre ellas están en `src/LandingVideo.jsx`.

## Cómo se usa

```bash
cd video
npm install
npm run studio          # editor de Remotion para ver y ajustar las escenas
npm run render          # genera out/landing.mp4 (1920x1080, 60 fps)
node render.mjs still 300   # un cuadro suelto en out/still-300.png
```

Después se comprime para la web (WebM, MP4 y la imagen de portada) y se copia a
`public/video/`:

```bash
ffmpeg -i out/landing.mp4 -vf scale=1600:-2 -c:v libvpx-vp9 -b:v 0 -crf 38 -row-mt 1 -an ../public/video/bolsillox.webm
ffmpeg -i out/landing.mp4 -vf scale=1600:-2 -c:v libx264 -crf 27 -preset slow -pix_fmt yuv420p -movflags +faststart -an ../public/video/bolsillox.mp4
ffmpeg -ss 9 -i out/landing.mp4 -frames:v 1 -vf scale=1600:-2 -q:v 80 ../public/video/bolsillox-poster.webp
```

Remotion usa el Chromium del sistema (`REMOTION_BROWSER` para cambiarlo).
