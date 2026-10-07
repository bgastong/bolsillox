import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContextValue";

// Tema elegido ("dark" | "light" | "system"), el que se ve ("dark" | "light")
// y setTheme para cambiarlo.
export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}
