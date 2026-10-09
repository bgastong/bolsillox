import {
  ArrowLeftRightIcon,
  BanknoteIcon,
  BusIcon,
  CreditCardIcon,
  SmartphoneIcon,
  WalletCardsIcon,
} from "lucide-react";
import { PAYMENT_METHODS } from "@shared/catalog.js";

// Icono de cada medio de pago (para los desplegables y las listas).
const ICONS = {
  cash: BanknoteIcon,
  debit: WalletCardsIcon,
  credit: CreditCardIcon,
  transfer: ArrowLeftRightIcon,
  wallet: SmartphoneIcon,
  sube: BusIcon,
};

// Opciones para <Select>: [{ value, label, icon }].
export function paymentMethodOptions(t) {
  return PAYMENT_METHODS.map((method) => ({
    value: method,
    label: t(`pm_${method}`),
    icon: ICONS[method],
  }));
}
