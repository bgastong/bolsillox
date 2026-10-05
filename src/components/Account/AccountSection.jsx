import { useState } from "react";
import { LogOutIcon, Trash2Icon } from "lucide-react";
import { GoogleIcon } from "@/components/Brand/BrandIcons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/useToast";
import UserAvatar from "./UserAvatar";

// Confirmacion para borrar la cuenta: hay que escribir el email.
function DeleteAccountDialog({ open, onOpenChange }) {
  const { t } = useLanguage();
  const { user, deleteAccount } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const matches = email.trim().toLowerCase() === user.email;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!matches) return;
    setDeleting(true);
    try {
      // Al quedar sin sesion, App lleva al login.
      await deleteAccount(user.email);
      toast(t("accountDeleted"));
    } catch {
      toast(t("errorGeneric"), { variant: "error" });
      setDeleting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setEmail("");
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md" closeLabel={t("close")}>
        <DialogHeader>
          <DialogTitle>{t("deleteAccountTitle")}</DialogTitle>
          <DialogDescription>{t("deleteAccountDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="confirm-email">
              {t("deleteAccountConfirm", { email: user.email })}
            </Label>
            <Input
              id="confirm-email"
              type="email"
              inputMode="email"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={deleting}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={deleting}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={!matches || deleting}>
              {deleting ? t("deleting") : t("deleteAccountAction")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Seccion "Cuenta" de Ajustes: datos del usuario, cerrar sesion y borrar cuenta.
// Section: el contenedor de seccion de la pantalla de Ajustes.
function AccountSection({ Section }) {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Section id="settings-account" title={t("accountTitle")}>
      <div className="flex items-center gap-3">
        <UserAvatar name={user.name} />
        <div className="grid min-w-0 flex-1 gap-0.5">
          <span className="truncate font-medium">{user.name}</span>
          <span className="truncate text-sm text-muted-foreground">{user.email}</span>
        </div>
      </div>
      {user.hasGoogle && (
        <p className="m-0 flex items-center gap-2 text-sm text-muted-foreground">
          <GoogleIcon className="size-4" />
          {t("linkedWithGoogle")}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" onClick={logout} className="h-11 sm:h-9">
          <LogOutIcon data-icon="inline-start" />
          {t("logout")}
        </Button>
        <Button
          variant="ghost"
          onClick={() => setConfirmOpen(true)}
          className="h-11 text-destructive hover:bg-destructive/10 hover:text-destructive sm:ml-auto sm:h-9"
        >
          <Trash2Icon data-icon="inline-start" />
          {t("deleteAccountAction")}
        </Button>
      </div>
      <DeleteAccountDialog open={confirmOpen} onOpenChange={setConfirmOpen} />
    </Section>
  );
}

export default AccountSection;
