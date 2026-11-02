import { useState } from "react";
import { confirmCodeSchema, PASSWORD_MIN_LENGTH, registerSchema } from "@shared/authSchema.js";
import { AuthField, FormAlert } from "@/components/Auth/AuthLayout";
import { CodeField, ResendButton } from "@/components/Auth/CodeField";
import { TermsCheckbox } from "@/components/Auth/LegalLinks";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { authErrorKey } from "@/lib/authErrors";
import { useAuth } from "@/hooks/useAuth";
import { useAuthForm } from "@/hooks/useAuthForm";
import { useCooldown } from "@/hooks/useCooldown";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";

// Despues de crear la cuenta: si eligio empezar de cero, se borran los datos de ejemplo.
async function finish({ fresh, toast, t, onDone }) {
  if (fresh) {
    await api.deleteDemoData().catch(() => {});
    window.location.reload();
  }
  toast(t("demoConvertedToast"));
  onDone();
}

function AccountStep({ onCode, onDone }) {
  const { t, language } = useLanguage();
  const { convertDemo } = useAuth();
  const { toast } = useToast();
  const [fresh, setFresh] = useState(false);
  const { formRef, register, handleSubmit, formError, submitting } = useAuthForm({
    schema: registerSchema,
    initialValues: { name: "", email: "", password: "", acceptTerms: false },
    async onSubmit(data) {
      try {
        const result = await convertDemo({ ...data, language });
        if (result.verificationRequired) onCode({ data: { ...data, language }, email: result.email, fresh });
        else await finish({ fresh, toast, t, onDone });
      } catch (error) {
        if (error.code === "email_taken") error.fieldErrors = { email: "errorEmailTaken" };
        throw error;
      }
    },
  });

  return (
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
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
        <input
          type="checkbox"
          checked={fresh}
          onChange={(event) => setFresh(event.target.checked)}
          className="mt-[3px] size-[18px] shrink-0 cursor-pointer accent-[color:var(--primary)]"
        />
        <span className="grid gap-0.5">
          {t("demoStartFresh")}
          <span className="text-xs text-muted-foreground">{t("demoStartFreshHint")}</span>
        </span>
      </label>
      <TermsCheckbox {...register("acceptTerms")} />
      <Button type="submit" size="lg" className="mt-1 h-12 w-full sm:h-11" disabled={submitting}>
        {submitting ? t("creatingAccount") : t("demoCreateAccount")}
      </Button>
    </form>
  );
}

function CodeStep({ pending, onBack, onDone }) {
  const { t } = useLanguage();
  const { confirmDemo } = useAuth();
  const { toast } = useToast();
  const [seconds, setSeconds] = useCooldown(60);
  const { formRef, register, handleSubmit, formError, submitting } = useAuthForm({
    schema: confirmCodeSchema,
    initialValues: { code: "" },
    async onSubmit({ code }) {
      await confirmDemo(code);
      await finish({ fresh: pending.fresh, toast, t, onDone });
    },
  });

  async function resend() {
    try {
      await api.convertDemo(pending.data);
      setSeconds(60);
      toast(t("codeResent"));
    } catch (error) {
      toast(t(authErrorKey(error)), { variant: "error" });
      if (error.code === "code_cooldown") setSeconds(60);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="grid gap-4">
      <p className="m-0 text-sm text-muted-foreground">{t("verifySubtitle", { email: pending.email })}</p>
      <FormAlert>{formError && t(formError)}</FormAlert>
      <CodeField autoFocus {...register("code")} hint={t("verifySpamHint")} />
      <Button type="submit" size="lg" className="h-12 w-full sm:h-11" disabled={submitting}>
        {submitting ? t("verifying") : t("verifyAction")}
      </Button>
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          {t("demoChangeEmail")}
        </Button>
        <ResendButton seconds={seconds} onResend={resend} />
      </div>
    </form>
  );
}

/*
Pasar la cuenta de prueba a una cuenta normal: nombre, email y contraseña (y el
codigo por email, si el servidor los manda). Se queda con todo lo que cargo,
salvo que elija empezar de cero.
*/
function ConvertDemoDialog({ open, onOpenChange }) {
  const { t } = useLanguage();
  const [pending, setPending] = useState(null);
  const close = () => {
    setPending(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-md" closeLabel={t("close")}>
        <DialogHeader>
          <DialogTitle>{t(pending ? "verifyTitle" : "demoConvertTitle")}</DialogTitle>
          {!pending && <DialogDescription>{t("demoConvertSubtitle")}</DialogDescription>}
        </DialogHeader>
        {pending ? (
          <CodeStep pending={pending} onBack={() => setPending(null)} onDone={close} />
        ) : (
          <AccountStep onCode={setPending} onDone={close} />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ConvertDemoDialog;
