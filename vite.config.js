import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const API_URL = process.env.VITE_API_PROXY || "http://localhost:3001";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
