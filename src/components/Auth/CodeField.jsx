import { useState } from "react";
import { AuthField } from "./AuthLayout";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";

// Campo para el codigo de 6 digitos (el celular sugiere el codigo del SMS/email).
export function CodeField(props) {
  const { t } = useLanguage();
  return (
    <AuthField
      label={t("codeLabel")}
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={7}
      placeholder="000000"
      className="h-14 text-center font-mono text-2xl tracking-[0.4em] sm:h-14"
      {...props}
    />
  );
}

// Boton "Reenviar codigo" con la espera visible.
export function ResendButton({ onResend, seconds }) {
  const { t } = useLanguage();
  const [sending, setSending] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={seconds > 0 || sending}
      onClick={async () => {
        setSending(true);
        try {
          await onResend();
        } finally {
          setSending(false);
        }
      }}
      className="w-full"
    >
      {seconds > 0 ? t("resendIn", { seconds }) : t("resendCode")}
    </Button>
  );
}
