# Video del tutorial

Video de la página `/tutorial` de la app: bolsillox real grabado en la compu,
dentro de una ventana, con una cámara que se acerca sola a lo que se va haciendo.
Recorre cargar un gasto, el saldo, el flujo de caja, los gastos por categoría,
los presupuestos, las metas y las inversiones. Está hecho con
[Remotion](https://www.remotion.dev) y no es parte de la app: tiene sus propias
dependencias.

## Archivos

- `record-tutorial.cjs`: graba la app a 1440x900 con la captura de pantalla de
  Chrome a 2x (2880x1800) y arma `public/tutorial-recording.mp4`. También guarda
  `public/tutorial-marks.json`: en qué segundo pasa cada cosa y dónde está en
  pantalla. Durante la grabación no se muestra el aviso de datos de ejemplo, la
  cotización del dólar es fija y no salta el aviso de presupuesto excedido (se
  cambian las respuestas de la API en el navegador, no la base). El gasto que
  carga se borra al final.
- `src/chapters.js`: velocidad, portada, cierre y capítulos a partir de los momentos.
- `src/Tutorial.jsx`: el video. La cámara sale de los momentos y las posiciones
  grabadas, así que si se vuelve a grabar se acomoda sola.
- `src/camera.jsx`, `src/theme.js`, `src/ui.jsx`, `src/motion.js`: cámara,
  colores, tipografías, logo y curvas de animación.
- `make-web.sh`: comprime el video para la web y lo copia a `public/video/`.

## Cómo se usa

```bash
cd video
npm install
# Con la app corriendo (npm run dev en la raíz) y la cuenta de ejemplo:
NODE_PATH=$(npm root -g) node record-tutorial.cjs
npm run studio          # editor de Remotion para ver y ajustar
npm run render          # out/tutorial.mp4 (1920x1080, 60 fps); imprime los capítulos
node render.mjs still 300   # un cuadro suelto en out/still-300.png
./make-web.sh
```

Los segundos que imprime `render` van en `CHAPTERS` de `src/pages/Tutorial.jsx`.
Remotion usa el Chromium del sistema (`REMOTION_BROWSER` para cambiarlo).
