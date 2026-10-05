import { Link, useSearchParams } from "react-router-dom";
import { loginSchema } from "@shared/authSchema.js";
import { AuthField, AuthLayout, FormAlert, GoogleButton } from "@/components/Auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAuthForm } from "@/hooks/useAuthForm";
import { useLanguage } from "@/hooks/useLanguage";

function Login() {
  const { t } = useLanguage();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  // Al iniciar sesion, App redirige solo a la pantalla de inicio.
  const { formRef, register, handleSubmit, formError, submitting } = useAuthForm({
    schema: loginSchema,
    initialValues: { email: "", password: "" },
    onSubmit: login,
    initialFormError: searchParams.get("error") === "google" ? "errorGoogleLogin" : null,
  });

  return (
    <AuthLayout
      title={t("loginTitle")}
      subtitle={t("loginSubtitle")}
      footer={
        <>
          {t("noAccount")}{" "}
          <Link to="/register" className="font-medium text-primary underline-offset-4 hover:underline">
            {t("createAccount")}
          </Link>
        </>
      }
    >
      <GoogleButton />
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="grid gap-4">
        <FormAlert>{formError && t(formError)}</FormAlert>
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
          autoComplete="current-password"
          {...register("password")}
        />
        <Button type="submit" size="lg" className="mt-1 h-12 w-full sm:h-11" disabled={submitting}>
          {submitting ? t("signingIn") : t("signIn")}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default Login;
