import { createAppFromEnv } from "../server/setup.js";

/*
Funcion de Vercel: toda la API (/api/...) llega aca (ver vercel.json).
El build de Vite lo sirve directamente el CDN de Vercel.
La app se arma una sola vez por instancia y se reutiliza entre pedidos.
*/
const { app } = await createAppFromEnv({
  isProduction: true,
  serveStatic: false,
  requireDatabase: true,
});

export default app;
