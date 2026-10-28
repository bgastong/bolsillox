# Video de la página de inicio

Video de bolsillox que se muestra en la landing («Mirá cómo funciona»): la app
real en un celular en 3D, con frases a la izquierda que se van marcando a medida
que se recorre la web (cargar un gasto, saldo, flujo de caja, gastos por
categoría, metas e inversiones). Está hecho con
[Remotion](https://www.remotion.dev) y no es parte de la app: tiene sus propias
dependencias.

## Archivos

- `record-app.cjs`: graba la app en tamaño celular con la captura de pantalla de
  Chrome a 3x (1170x2532) y arma `public/app-recording.mp4`. Para que el video
  quede prolijo, durante la grabación no se muestra el aviso de datos de ejemplo,
  la cotización del dólar es fija y no salta el aviso de presupuesto excedido
  (se cambian las respuestas de la API en el navegador, no la base). El gasto
  que carga se borra al final.
- `src/PhoneVideo.jsx`: el video. Los momentos (en segundos de la grabación) de
  cada frase, el giro del celular y el corte entre Metas e Inversiones están
  arriba de todo.
- `src/theme.js`, `src/ui.jsx`, `src/motion.js`: colores, tipografías, logo y curvas de animación.

## Cómo se usa

```bash
cd video
npm install
# 1. Con la app corriendo (npm run dev en la raíz) y la cuenta de ejemplo:
NODE_PATH=$(npm root -g) node record-app.cjs   # imprime los momentos de la grabación
# 2. Si cambiaron los momentos, actualizarlos en src/PhoneVideo.jsx.
npm run studio          # editor de Remotion para ver y ajustar
npm run render          # genera out/landing.mp4 (1920x1080, 60 fps)
node render.mjs still 300   # un cuadro suelto en out/still-300.png
```

Después se comprime para la web y se copia a `public/video/`:

```bash
ffmpeg -i out/landing.mp4 -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 -an ../public/video/bolsillox.webm
ffmpeg -i out/landing.mp4 -c:v libx264 -crf 23 -preset slow -pix_fmt yuv420p -movflags +faststart -an ../public/video/bolsillox.mp4
ffmpeg -ss 3.2 -i out/landing.mp4 -frames:v 1 -q:v 85 ../public/video/bolsillox-poster.webp
```

Remotion usa el Chromium del sistema (`REMOTION_BROWSER` para cambiarlo).
