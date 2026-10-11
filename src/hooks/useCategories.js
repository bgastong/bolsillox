import { useContext } from "react";
import { CategoriesContext } from "../context/CategoriesContextValue";

// Categorias fijas y propias: nombre, icono y color de cada una.
export function useCategories() {
  const context = useContext(CategoriesContext);

  if (!context) {
    throw new Error("useCategories must be used inside CategoriesProvider");
  }

  return context;
}
