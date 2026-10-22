import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const API_URL = process.env.VITE_API_PROXY || "http://localhost:3001";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    /*
    App instalable: un service worker guarda la app (pantallas, estilos, iconos y
    tipografias) en el dispositivo, asi abre al instante y tambien sin señal.
    - Nunca guarda la API: los datos siempre vienen del servidor.
    - Deja afuera lo pesado que no todos usan (el 3D de la landing, imagenes grandes).
    - registerType "prompt": una version nueva se activa cuando la persona toca
      "Actualizar" (ver UpdatePrompt), no en medio de lo que esta haciendo.
    - El manifest es public/manifest.webmanifest (manifest: false).
    */
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg}", "*.png", "assets/geist*-latin-wght-normal-*.woff2"],
        globIgnores: ["**/billScene-*.js", "og.png", "screenshots/**"],
        // Las rutas de la app abren index.html; la API y los archivos con extension no.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /\.[a-z0-9]+$/i],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        // React y el router casi nunca cambian: en un archivo aparte quedan
        // cacheados entre versiones de la app.
        advancedChunks: {
          groups: [
            {
              name: "react",
              test: /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/,
            },
          ],
        },
      },
    },
  },
  server: {
    proxy: {
      // changeOrigin en false: la API recibe el Host original (localhost:5173),
      // que es el que compara con el Origin para frenar pedidos de otros sitios.
      "/api": { target: API_URL, changeOrigin: false },
    },
  },
});
