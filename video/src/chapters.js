/*
Tiempos del tutorial a partir de la grabacion (public/tutorial-marks.json).
Lo usan el video (Tutorial.jsx) y render.mjs, que imprime en que segundo
empieza cada capitulo para la pagina /tutorial de la app.
*/
export const RATE = 1.15; // la grabacion va un poco mas rapida
export const INTRO = 2.2; // segundos de portada antes de la app
export const OUTRO = 3.6; // segundos de cierre despues de la app
export const START = 0.3; // segundo de la grabacion donde arranca el video

// Segundo de la grabacion -> segundo del video.
export const videoSecond = (t) => INTRO + (t - START) / RATE;

export function timeline(recording) {
  const mark = Object.fromEntries(recording.marks.map((item) => [item.name, item]));
  // Etiqueta de cada paso en el video y capitulos de la pagina.
  const chapters = [
    { from: mark.newBtn.t - 0.6, title: "Cargá un gasto en segundos" },
    { from: mark.balance.t, title: "Tu saldo se actualiza al instante" },
    { from: mark.cashflow.t - 0.4, title: "Mirá tu flujo de caja" },
    { from: mark.categories.t, title: "Sabé a dónde se va tu plata" },
    { from: mark.budgets.t - 0.8, title: "Ponele un tope a cada categoría" },
    { from: mark.goals.t - 0.6, title: "Juntá para tus metas" },
    { from: mark.investments.t - 0.6, title: "Seguí tus inversiones" },
    { from: mark.sp500.t - 0.6, title: "El S&P 500 y el dólar de cada gobierno" },
  ];
  return { mark, chapters, end: mark.end.t };
}
