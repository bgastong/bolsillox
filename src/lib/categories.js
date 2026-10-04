import {
  BriefcaseIcon,
  BusIcon,
  CircleEllipsisIcon,
  FilmIcon,
  GiftIcon,
  GraduationCapIcon,
  HeartPulseIcon,
  HouseIcon,
  LaptopIcon,
  LineChartIcon,
  PlusCircleIcon,
  RepeatIcon,
  ShoppingBagIcon,
  UtensilsIcon,
  ZapIcon,
} from "lucide-react";

// Color e icono de cada categoria. El icono y el nombre acompañan siempre
// al color, asi la categoria no se identifica solo por el color.
export const CATEGORY_META = {
  // Gastos
  food: { color: "#fbbf24", icon: UtensilsIcon },
  transport: { color: "#38bdf8", icon: BusIcon },
  housing: { color: "#a78bfa", icon: HouseIcon },
  services: { color: "#2dd4bf", icon: ZapIcon },
  subscriptions: { color: "#f472b6", icon: RepeatIcon },
  health: { color: "#fb7185", icon: HeartPulseIcon },
  entertainment: { color: "#fb923c", icon: FilmIcon },
  education: { color: "#818cf8", icon: GraduationCapIcon },
  shopping: { color: "#e879f9", icon: ShoppingBagIcon },
  other: { color: "#94a3b8", icon: CircleEllipsisIcon },
  // Ingresos
  salary: { color: "#34d399", icon: BriefcaseIcon },
  freelance: { color: "#a3e635", icon: LaptopIcon },
  investments: { color: "#22d3ee", icon: LineChartIcon },
  gift: { color: "#fde047", icon: GiftIcon },
  otherIncome: { color: "#86efac", icon: PlusCircleIcon },
};

const FALLBACK = { color: "#94a3b8", icon: CircleEllipsisIcon };

export function getCategoryMeta(category) {
  return CATEGORY_META[category] ?? FALLBACK;
}
