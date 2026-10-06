import { useContext } from "react";
import { CommandPaletteContext } from "../context/CommandPaletteValue";

// Abre el buscador global (⌘K / Ctrl+K) desde cualquier boton.
export function useCommandPalette() {
  const context = useContext(CommandPaletteContext);

  if (!context) {
    throw new Error("useCommandPalette must be used inside CommandPalette");
  }

  return context;
}
