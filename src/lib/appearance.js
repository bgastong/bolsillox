import { DEFAULT_APPEARANCE, normalizeAppearance } from "@shared/appearance.js";

/*
Colores a eleccion en el navegador. La preferencia vive en la cuenta, pero se
guarda una copia aca para aplicar la paleta antes de pintar (ver el script de
index.html), asi no hay parpadeo al abrir la app.
*/
export const APPEARANCE_STORAGE_KEY = "bolsillox.appearance";

export function getCachedAppearance() {
  try {
    const saved = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (saved) return normalizeAppearance(JSON.parse(saved));
  } catch {
    // sin storage o con un valor roto
  }
  return DEFAULT_APPEARANCE;
}

export function cacheAppearance(appearance) {
  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(appearance));
  } catch {
    // ignorado
  }
}

// <html data-palette="..."> cambia las variables --income, --expense y --danger (index.css).
export function applyPalette(palette) {
  const root = document.documentElement;
  if (palette === DEFAULT_APPEARANCE.palette) delete root.dataset.palette;
  else root.dataset.palette = palette;
}
