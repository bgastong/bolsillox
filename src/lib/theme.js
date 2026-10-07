// Tema de la app: "dark" | "light" | "system" (sigue al sistema operativo).
// Se guarda en el navegador y se aplica en <html data-theme="..."> antes de
// pintar (ver el script de index.html), asi no hay parpadeo al cargar.

export const THEME_STORAGE_KEY = "bolsillox.theme";
export const THEMES = ["dark", "light", "system"];

// Color de la barra del navegador en el celular para cada tema.
const THEME_COLORS = { dark: "#08090a", light: "#fbfbfa" };

export function getStoredTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (THEMES.includes(saved)) return saved;
  } catch {
    // sin storage (modo privado, etc.)
  }
  return "dark";
}

export function resolveTheme(theme) {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyTheme(resolved) {
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[resolved]);
}
