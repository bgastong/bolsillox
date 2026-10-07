import { useEffect } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { verifyEmailSchema } from "@shared/authSchema.js";
import { AuthLayout, FormAlert } from "@/components/Auth/AuthLayout";
import { CodeField, ResendButton } from "@/components/Auth/CodeField";
import { useCooldown } from "@/hooks/useCooldown";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { authErrorKey } from "@/lib/authErrors";
import { useAuth } from "@/hooks/useAuth";
import { useAuthForm } from "@/hooks/useAuthForm";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";

/*
Confirmar el email con el codigo de 6 digitos (despues de registrarse, o si
alguien intenta entrar sin haberlo confirmado: ?resend=1 pide un codigo nuevo).
Al confirmarlo se inicia sesion y App lleva al inicio.
*/
function VerifyEmail() {
  const { t, language } = useLanguage();
  const { verifyEmail } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const shouldResend = searchParams.get("resend") === "1";
  const [seconds, setSeconds] = useCooldown(shouldResend ? 0 : 60);

  const { formRef, register, handleSubmit, formError, submitting } = useAuthForm({
    schema: verifyEmailSchema.pick({ code: true }),
    initialValues: { code: "" },
    async onSubmit({ code }) {
      await verifyEmail({ email, code });
      toast(t("verifiedToast"));
    },
  });

  async function resend({ silent = false } = {}) {
    try {
      await api.resendVerification({ email, language });
      setSeconds(60);
      if (!silent) toast(t("codeResent"));
    } catch (error) {
      if (!silent) toast(t(authErrorKey(error)), { variant: "error" });
      if (error.code === "code_cooldown") setSeconds(60);
    }
  }

  // Vino desde el login con la cuenta sin confirmar: se manda un codigo nuevo.
  useEffect(() => {
    if (shouldResend && email) resend({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!email) return <Navigate to="/register" replace />;

  return (
    <AuthLayout
      title={t("verifyTitle")}
      subtitle={t("verifySubtitle", { email })}
      footer={
        <Link to="/register" className="font-medium text-primary underline-offset-4 hover:underline">
          {t("wrongEmailLink")}
        </Link>
      }
    >
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="grid gap-4">
        <FormAlert>{formError && t(formError)}</FormAlert>
        <CodeField autoFocus {...register("code")} hint={t("verifySpamHint")} />
        <Button type="submit" size="lg" className="h-12 w-full sm:h-11" disabled={submitting}>
          {submitting ? t("verifying") : t("verifyAction")}
        </Button>
        <ResendButton seconds={seconds} onResend={() => resend()} />
      </form>
    </AuthLayout>
  );
}

export default VerifyEmail;
