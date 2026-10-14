import { useCallback, useEffect, useMemo, useState } from "react";
import { CURRENCIES, DEFAULT_CURRENCY } from "@shared/catalog.js";
import { api } from "@/lib/api";
import { useLanguage } from "@/hooks/useLanguage";
import { SettingsContext } from "./SettingsContextValue";

const CURRENCY_KEY = "bolsillox.displayCurrency";
// La cotizacion se vuelve a pedir cada 30 minutos mientras la app esta abierta.
const RATES_REFRESH_MS = 30 * 60 * 1000;

function getInitialCurrency() {
  try {
    const saved = localStorage.getItem(CURRENCY_KEY);
    if (CURRENCIES.includes(saved)) return saved;
  } catch {
    // localStorage puede no estar disponible
  }
  return DEFAULT_CURRENCY;
}

export function SettingsProvider({ children }) {
  const { language } = useLanguage();
  // Los recordatorios por email salen en el idioma elegido en la app.
  useEffect(() => {
    api.saveNotificationSettings({ language }).catch(() => {});
  }, [language]);

  const [currency, setCurrencyState] = useState(getInitialCurrency);
  const [rates, setRates] = useState(null);
  const [ratesError, setRatesError] = useState(null);

  const setCurrency = useCallback((next) => {
    if (!CURRENCIES.includes(next)) return;
    setCurrencyState(next);
    try {
      localStorage.setItem(CURRENCY_KEY, next);
    } catch {
      // ignorado
    }
  }, []);

  // Pide la cotizacion; el estado se actualiza cuando llega la respuesta.
  const fetchRates = useCallback(
    (signal) =>
      api.getRates({ signal }).then(
        (status) => {
          setRates(status);
          setRatesError(null);
          return status;
        },
        (error) => {
          if (error.name !== "AbortError") setRatesError(error);
          return null;
        },
      ),
    [],
  );

  const refreshRates = useCallback(() => fetchRates(), [fetchRates]);

  useEffect(() => {
    const controller = new AbortController();
    fetchRates(controller.signal);
    const timer = setInterval(() => fetchRates(), RATES_REFRESH_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [fetchRates]);

  const saveRateSettings = useCallback(async (settings) => {
    const status = await api.saveRateSettings(settings);
    setRates(status);
    return status;
  }, []);

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      rates,
      ratesError,
      // Pesos por dolar segun la fuente elegida (null si no hay cotizacion).
      rate: rates?.rate ?? null,
      refreshRates,
      saveRateSettings,
    }),
    [currency, setCurrency, rates, ratesError, refreshRates, saveRateSettings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
