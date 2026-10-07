import { useState } from "react";
import {
  changeEmailSchema,
  changePasswordSchema,
  confirmCodeSchema,
  PASSWORD_MIN_LENGTH,
  updateProfileSchema,
} from "@shared/authSchema.js";
import { AuthField, FormAlert } from "@/components/Auth/AuthLayout";
import { CodeField } from "@/components/Auth/CodeField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useAuthForm } from "@/hooks/useAuthForm";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";

// Errores de la API que corresponden a un campo puntual del formulario.
function fieldError(error, map) {
  const field = map[error.code];
  if (field) error.fieldErrors = { [field.name]: field.key };
  return error;
}

function DialogActions({ onCancel, submitting, label, busyLabel }) {
  const { t } = useLanguage();
  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
      <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
        {t("cancel")}
      </Button>
      <Button type="submit" disabled={submitting}>
        {submitting ? busyLabel : label}
      </Button>
    </div>
  );
}

function NameForm({ onDone }) {
  const { t } = useLanguage();
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const { formRef, register, handleSubmit, formError, submitting } = useAuthForm({
    schema: updateProfileSchema,
    initialValues: { name: user.name },
    async onSubmit(data) {
      updateUser(await api.updateProfile(data));
      toast(t("profileSaved"));
      onDone();
    },
  });

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="grid gap-4">
      <FormAlert>{formError && t(formError)}</FormAlert>
      <AuthField label={t("yourName")} autoComplete="name" autoFocus {...register("name")} />
      <DialogActions onCancel={onDone} submitting={submitting} label={t("saveChanges")} busyLabel={t("saving")} />
    </form>
  );
}

function PasswordForm({ onDone }) {
  const { t } = useLanguage();
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const { formRef, register, handleSubmit, formError, submitting } = useAuthForm({
    schema: changePasswordSchema,
    initialValues: user.hasPassword ? { currentPassword: "", newPassword: "" } : { newPassword: "" },
    async onSubmit(data) {
      try {
        updateUser(await api.changePassword(data));
      } catch (error) {
        throw fieldError(error, { wrong_password: { name: "currentPassword", key: "errorWrongPassword" } });
      }
      toast(t("passwordChanged"));
      onDone();
    },
  });

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="grid gap-4">
      <FormAlert>{formError && t(formError)}</FormAlert>
      {user.hasPassword && (
        <AuthField
          label={t("currentPassword")}
          type="password"
          autoComplete="current-password"
          autoFocus
          {...register("currentPassword")}
        />
      )}
      <AuthField
        label={t("newPassword")}
        type="password"
        autoComplete="new-password"
        hint={t("passwordHint", { count: PASSWORD_MIN_LENGTH })}
        autoFocus={!user.hasPassword}
        {...register("newPassword")}
      />
      <DialogActions onCancel={onDone} submitting={submitting} label={t("saveChanges")} busyLabel={t("saving")} />
    </form>
  );
}

// Cambiar el email, paso 1: email nuevo (+ contraseña). Se manda un codigo al email nuevo.
function EmailRequestStep({ onSent, onCancel }) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { formRef, register, handleSubmit, formError, submitting } = useAuthForm({
    schema: changeEmailSchema,
    initialValues: user.hasPassword ? { email: "", password: "" } : { email: "" },
    async onSubmit(data) {
      try {
        await api.changeEmail({ ...data, language });
      } catch (error) {
        throw fieldError(error, {
          wrong_password: { name: "password", key: "errorWrongPassword" },
          email_taken: { name: "email", key: "errorEmailTaken" },
          email_same: { name: "email", key: "errorEmailSame" },
        });
      }
      onSent(data.email);
    },
  });

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="grid gap-4">
      <FormAlert>{formError && t(formError)}</FormAlert>
      <AuthField
        label={t("newEmail")}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        autoFocus
        {...register("email")}
      />
      {user.hasPassword && (
        <AuthField
          label={t("currentPassword")}
          type="password"
          autoComplete="current-password"
          {...register("password")}
        />
      )}
      <DialogActions onCancel={onCancel} submitting={submitting} label={t("continueAction")} busyLabel={t("sendingCode")} />
    </form>
  );
}

// Paso 2: el codigo que llego al email nuevo.
function EmailCodeStep({ email, onDone }) {
  const { t } = useLanguage();
  const { updateUser } = useAuth();
  const { toast } = useToast();
  const { formRef, register, handleSubmit, formError, submitting } = useAuthForm({
    schema: confirmCodeSchema,
    initialValues: { code: "" },
    async onSubmit(data) {
      updateUser(await api.confirmEmailChange(data));
      toast(t("emailChanged"));
      onDone();
    },
  });

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="grid gap-4">
      <p className="m-0 text-sm text-muted-foreground">{t("changeEmailCodeHint", { email })}</p>
      <FormAlert>{formError && t(formError)}</FormAlert>
      <CodeField autoFocus {...register("code")} hint={t("verifySpamHint")} />
      <DialogActions onCancel={onDone} submitting={submitting} label={t("saveChanges")} busyLabel={t("saving")} />
    </form>
  );
}

function EmailForm({ onDone }) {
  const [pendingEmail, setPendingEmail] = useState(null);
  return pendingEmail ? (
    <EmailCodeStep email={pendingEmail} onDone={onDone} />
  ) : (
    <EmailRequestStep onSent={setPendingEmail} onCancel={onDone} />
  );
}

const DIALOGS = {
  name: { title: "editName", Form: NameForm },
  email: { title: "changeEmailTitle", description: "changeEmailDescription", Form: EmailForm },
  password: { title: "changePasswordTitle", description: "changePasswordDescription", Form: PasswordForm },
  createPassword: { title: "setPasswordTitle", description: "setPasswordDescription", Form: PasswordForm },
};

// Dialogo para cambiar un dato de la cuenta. kind: "name" | "email" | "password" | "createPassword" | null.
export function AccountDialog({ kind, onClose }) {
  const { t } = useLanguage();
  const dialog = kind ? DIALOGS[kind] : null;

  return (
    <Dialog open={Boolean(dialog)} onOpenChange={(open) => !open && onClose()}>
      {dialog && (
        <DialogContent className="max-w-md" closeLabel={t("close")}>
          <DialogHeader>
            <DialogTitle>{t(dialog.title)}</DialogTitle>
            {dialog.description && <DialogDescription>{t(dialog.description)}</DialogDescription>}
          </DialogHeader>
          <dialog.Form onDone={onClose} />
        </DialogContent>
      )}
    </Dialog>
  );
}
