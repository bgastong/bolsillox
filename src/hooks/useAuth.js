import { useContext } from "react";
import { AuthContext } from "../context/AuthContextValue";

// Usuario con sesion iniciada y acciones de cuenta (login, logout...).
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
