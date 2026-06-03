import { useLanguage } from "../../../hooks/useLanguage";
import styles from "./SummaryCards.module.css";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";

const summaryCards = [
  {
    title: "Saldo actual",
    value: "$125.000",
    description: "Disponible",
  },
  {
    title: "Total gastado",
    value: "$45.000",
    description: "Este mes",
  },
  {
    title: "Ingresos",
    value: "$170.000",
    description: "Este mes",
  },
];

function SummaryCards() {
  const { t } = useLanguage();
  return <div className={styles.title}>{t("categorytitle")}</div>;
}

export default SummaryCards;
