import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";

// Opciones de tema con su icono y la clave del texto de ayuda.
export const THEME_OPTIONS = [
  { value: "dark", icon: MoonIcon, detailKey: "themeDarkDetail" },
  { value: "light", icon: SunIcon, detailKey: "themeLightDetail" },
  { value: "system", icon: MonitorIcon, detailKey: "themeSystemDetail" },
];
