import { useCallback, useEffect, useMemo, useState } from "react";
import { api, UNAUTHORIZED_EVENT } from "@/lib/api";
import { AuthContext } from "./AuthContextValue";

/*
Sesion del usuario. La cookie es httpOnly, asi que el front no la ve:
pregunta a /api/auth/me quien es.
status: "loading" | "authenticated" | "guest"
loggedOut: true si la persona cerro sesion (o borro la cuenta) a proposito;
asi al volver a entrar va al inicio y no a la ultima pantalla.
*/
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: "loading", user: null });
  // google: login con Google disponible; email: se pueden enviar codigos.
  const [config, setConfig] = useState({ google: false, email: false });

  useEffect(() => {
    const controller = new AbortController();
    api.me({ signal: controller.signal }).then(
      (user) => setState({ status: "authenticated", user }),
      (error) => {
        if (error.name !== "AbortError") setState({ status: "guest", user: null });
      },
    );
    api.getAuthConfig({ signal: controller.signal }).then(setConfig, () => {});
    return () => controller.abort();
  }, []);

  // Cualquier 401 de la API (sesion vencida) vuelve al login.
  useEffect(() => {
    const onUnauthorized = () => setState({ status: "guest", user: null });
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const login = useCallback(async (data) => {
    const user = await api.login(data);
    setState({ status: "authenticated", user });
    return user;
  }, []);

  /*
  Registro. Si el servidor manda un codigo por email, devuelve
  { verificationRequired: true, email } y la sesion empieza al confirmarlo.
  */
  const register = useCallback(async (data) => {
    const result = await api.register(data);
    if (result.verificationRequired) return result;
    const user = { ...result };
    delete user.verificationRequired;
    setState({ status: "authenticated", user });
    return { verificationRequired: false, user };
  }, []);

  // Confirmar el email o recuperar la contraseña tambien inician sesion.
  const verifyEmail = useCallback(async (data) => {
    const user = await api.verifyEmail(data);
    setState({ status: "authenticated", user });
    return user;
  }, []);

  const resetPassword = useCallback(async (data) => {
    const user = await api.resetPassword(data);
    setState({ status: "authenticated", user });
    return user;
  }, []);

  // Despues de cambiar nombre, email o contraseña.
  const updateUser = useCallback((user) => {
    setState((prev) => ({ ...prev, user }));
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setState({ status: "guest", user: null, loggedOut: true });
    }
  }, []);

  const deleteAccount = useCallback(async (email) => {
    await api.deleteAccount(email);
    setState({ status: "guest", user: null, loggedOut: true });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      config,
      login,
      register,
      verifyEmail,
      resetPassword,
      updateUser,
      logout,
      deleteAccount,
    }),
    [state, config, login, register, verifyEmail, resetPassword, updateUser, logout, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
