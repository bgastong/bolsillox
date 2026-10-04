import { useCallback, useEffect, useState } from "react";

/*
Ejecuta `load(signal)` cada vez que cambia la funcion (memoizada con useCallback
por quien llama) o cuando se pide `reload()`.
Mientras recarga conserva los datos anteriores para no "parpadear".
*/
export function useApiData(load) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({
    load: null,
    version: -1,
    data: undefined,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    load(controller.signal).then(
      (data) => setState({ load, version, data, error: null }),
      (error) => {
        if (error.name === "AbortError") return;
        setState((prev) => ({ load, version, data: prev.data, error }));
      },
    );

    return () => controller.abort();
  }, [load, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  const loading = state.load !== load || state.version !== version;

  return {
    data: state.data,
    error: loading ? null : state.error,
    loading,
    reload,
  };
}
