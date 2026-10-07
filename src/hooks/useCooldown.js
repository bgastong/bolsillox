import { useEffect, useState } from "react";

// Cuenta regresiva para volver a pedir un codigo (el servidor exige un minuto).
export function useCooldown(initial = 60) {
  const [seconds, setSeconds] = useState(initial);
  useEffect(() => {
    if (seconds <= 0) return undefined;
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);
  return [seconds, setSeconds];
}
