import { Link, useNavigate } from "react-router-dom";
import { PASSWORD_MIN_LENGTH, registerSchema } from "@shared/authSchema.js";
import { AuthField, AuthLayout, FormAlert, GoogleButton } from "@/components/Auth/AuthLayout";
import { TermsCheckbox } from "@/components/Auth/LegalLinks";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAuthForm } from "@/hooks/useAuthForm";
import { useLanguage } from "@/hooks/useLanguage";

function Register() {
  const { t, language } = useLanguage();
  const { register: createAccount } = useAuth();
  const navigate = useNavigate();
  const { formRef, register, handleSubmit, formError, submitting } = useAuthForm({
    schema: registerSchema,
    initialValues: { name: "", email: "", password: "", acceptTerms: false },
    async onSubmit(data) {
      try {
        const result = await createAccount({ ...data, language });
        // Llega un codigo por email: se confirma en /verificar.
        if (result.verificationRequired) {
          navigate(`/verificar?email=${encodeURIComponent(result.email)}`, { replace: true });
        }
      } catch (error) {
        // Email ya registrado: se muestra en el campo email.
        if (error.code === "email_taken") error.fieldErrors = { email: "errorEmailTaken" };
        throw error;
      }
    },
  });

  return (
    <AuthLayout
      title={t("registerTitle")}
      subtitle={t("registerSubtitle")}
      footer={
        <>
          {t("haveAccount")}{" "}
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            {t("signIn")}
          </Link>
        </>
      }
    >
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="grid gap-4">
        <FormAlert>{formError && t(formError)}</FormAlert>
        <AuthField label={t("yourName")} autoComplete="name" {...register("name")} />
        <AuthField
          label={t("email")}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          {...register("email")}
        />
        <AuthField
          label={t("password")}
          type="password"
          autoComplete="new-password"
          hint={t("passwordHint", { count: PASSWORD_MIN_LENGTH })}
          {...register("password")}
        />
        <TermsCheckbox {...register("acceptTerms")} />
        <Button type="submit" size="lg" className="mt-1 h-12 w-full sm:h-11" disabled={submitting}>
          {submitting ? t("creatingAccount") : t("createAccount")}
        </Button>
      </form>
      <GoogleButton />
    </AuthLayout>
  );
}

export default Register;
