import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useMovements } from "@/hooks/useMovements";

/*
Atajo "Nuevo movimiento" de la app instalada (manifest.webmanifest): abre
/?nuevo=1 y aca se abre el formulario. El parametro se saca de la direccion
para que al recargar no se vuelva a abrir.
*/
function OpenFromShortcut() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { openCreate } = useMovements();
  const fromShortcut = searchParams.has("nuevo");

  useEffect(() => {
    if (!fromShortcut) return;
    setSearchParams(
      (params) => {
        params.delete("nuevo");
        return params;
      },
      { replace: true },
    );
    openCreate();
  }, [fromShortcut, openCreate, setSearchParams]);

  return null;
}

export default OpenFromShortcut;
