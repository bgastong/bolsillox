import { useState } from "react";
import { Link } from "react-router-dom";
import { PASSWORD_MIN_LENGTH, requestCodeSchema, resetPasswordSchema } from "@shared/authSchema.js";
import { AuthField, AuthLayout, FormAlert } from "@/components/Auth/AuthLayout";
import { CodeField, ResendButton } from "@/components/Auth/CodeField";
import { useCooldown } from "@/hooks/useCooldown";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { authErrorKey } from "@/lib/authErrors";
import { useAuth } from "@/hooks/useAuth";
import { useAuthForm } from "@/hooks/useAuthForm";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";

// Paso 1: el email al que se manda el codigo.
function RequestStep({ onSent }) {
  const { t, language } = useLanguage();
  const { formRef, register, handleSubmit, formError, submitting } = useAuthForm({
    schema: requestCodeSchema.pick({ email: true }),
    initialValues: { email: "" },
    async onSubmit({ email }) {
      await api.forgotPassword({ email, language });
      onSent(email);
    },
  });

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="grid gap-4">
      <FormAlert>{formError && t(formError)}</FormAlert>
      <AuthField
        label={t("email")}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        autoFocus
        {...register("email")}
      />
      <Button type="submit" size="lg" className="h-12 w-full sm:h-11" disabled={submitting}>
        {submitting ? t("sendingCode") : t("sendCode")}
      </Button>
    </form>
  );
}

// Paso 2: el codigo y la contraseña nueva. Al guardar, inicia sesion.
function ResetStep({ email }) {
  const { t, language } = useLanguage();
  const { resetPassword } = useAuth();
  const { toast } = useToast();
  const [seconds, setSeconds] = useCooldown(60);
  const { formRef, register, handleSubmit, formError, submitting } = useAuthForm({
    schema: resetPasswordSchema.pick({ code: true, password: true }),
    initialValues: { code: "", password: "" },
    async onSubmit({ code, password }) {
      await resetPassword({ email, code, password });
      toast(t("passwordResetToast"));
    },
  });

  async function resend() {
    try {
      await api.forgotPassword({ email, language });
      setSeconds(60);
      toast(t("codeResent"));
    } catch (error) {
      toast(t(authErrorKey(error)), { variant: "error" });
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="grid gap-4">
      <FormAlert>{formError && t(formError)}</FormAlert>
      <CodeField autoFocus {...register("code")} hint={t("verifySpamHint")} />
      <AuthField
        label={t("newPassword")}
        type="password"
        autoComplete="new-password"
        hint={t("passwordHint", { count: PASSWORD_MIN_LENGTH })}
        {...register("password")}
      />
      <Button type="submit" size="lg" className="h-12 w-full sm:h-11" disabled={submitting}>
        {submitting ? t("savingAndSigningIn") : t("resetAction")}
      </Button>
      <ResendButton seconds={seconds} onResend={resend} />
    </form>
  );
}

/*
Recuperar la contraseña: se pide el email, llega un codigo y con el se elige
una contraseña nueva. Por privacidad, la respuesta es la misma haya o no una
cuenta con ese email.
*/
function ForgotPassword() {
  const { t } = useLanguage();
  const [email, setEmail] = useState(null);

  return (
    <AuthLayout
      title={email ? t("resetTitle") : t("forgotTitle")}
      subtitle={email ? t("resetSubtitle", { email }) : t("forgotSubtitle")}
      footer={
        <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          {t("backToLogin")}
        </Link>
      }
    >
      {email ? <ResetStep email={email} /> : <RequestStep onSent={setEmail} />}
    </AuthLayout>
  );
}

export default ForgotPassword;
