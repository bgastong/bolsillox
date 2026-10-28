# Video de la página de inicio

En la landing («Mirá cómo funciona») se ve la app en un celular en 3D con los
pasos a la izquierda (cargar un gasto, saldo, flujo de caja, gastos por
categoría, metas e inversiones). Solo la pantalla del celular es un video: el
celular, el giro, los pasos y el fondo son de la página
(`src/components/Landing/PhoneShowcase.jsx`) y siguen al segundo del video.

## Archivos

- `record-app.cjs`: graba la app en tamaño celular con la captura de pantalla de
  Chrome a 3x (1170x2532) y arma `public/app-recording.mp4`. Para que quede
  prolijo, durante la grabación no se muestra el aviso de datos de ejemplo, la
  cotización del dólar es fija y no salta el aviso de presupuesto excedido (se
  cambian las respuestas de la API en el navegador, no la base). El gasto que
  carga se borra al final.
- `make-web.sh`: corta el segundo de carga entre Metas e Inversiones, acelera la
  grabación un 10 % y la guarda en `public/video/` como WebM y MP4 de 720 px de
  ancho, con la imagen de portada.

## Cómo se usa

Con la app corriendo (`npm run dev` en la raíz) y la cuenta de ejemplo:

```bash
cd video
NODE_PATH=$(npm root -g) node record-app.cjs   # imprime los momentos de la grabación
./make-web.sh
```

Si cambian los momentos de la grabación, hay que actualizar el corte en
`make-web.sh` y el segundo en que empieza cada paso (`STEPS`) en
`PhoneShowcase.jsx`.
