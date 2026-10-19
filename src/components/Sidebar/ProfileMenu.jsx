import { useNavigate } from "react-router-dom";
import {
  BellIcon,
  CoinsIcon,
  DollarSignIcon,
  LanguagesIcon,
  LogOutIcon,
  PaletteIcon,
  SettingsIcon,
  TagIcon,
  UserIcon,
} from "lucide-react";
import UserAvatar from "@/components/Account/UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import styles from "./Sidebar.module.css";

// Partes de Ajustes a las que se puede ir directo (el id es el titulo de cada seccion).
const SETTINGS_SHORTCUTS = [
  { id: "settings-account", labelKey: "accountTitle", icon: UserIcon },
  { id: "settings-currency", labelKey: "profileMenuCurrency", icon: CoinsIcon },
  { id: "settings-rate", labelKey: "rateTitle", icon: DollarSignIcon },
  { id: "settings-categories", labelKey: "categoriesTitle", icon: TagIcon },
  { id: "settings-notifications", labelKey: "notificationsTitle", icon: BellIcon },
  { id: "settings-theme", labelKey: "themeTitle", icon: PaletteIcon },
  { id: "settings-language", labelKey: "language", icon: LanguagesIcon },
];

/*
Perfil abajo del menu lateral: inicial, nombre y la ruedita de ajustes. Toda la
tarjeta abre un menu para ir directo a cada parte de Ajustes o cerrar sesion.
- compact: solo la inicial en un circulo (barra de arriba en el celular).
- onNavigate: cierra el menu lateral al elegir una opcion.
*/
function ProfileMenu({ onNavigate, compact = false }) {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function go(id) {
    onNavigate?.();
    navigate(`/settings#${id}`);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <button
            type="button"
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t("profileMenuLabel", { name: user.name })}
          >
            <UserAvatar name={user.name} className="size-10 text-sm" />
          </button>
        ) : (
          <button type="button" className={styles.footerCard} aria-label={t("profileMenuLabel", { name: user.name })}>
            <UserAvatar name={user.name} className="size-9 text-sm" />
            <span className={styles.footerName}>{user.name}</span>
            <SettingsIcon className={styles.footerGear} aria-hidden="true" />
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={compact ? "bottom" : "top"}
        align={compact ? "end" : "start"}
        sideOffset={8}
        className={compact ? "min-w-60" : "w-(--radix-dropdown-menu-trigger-width) min-w-56"}
      >
        {compact && (
          <DropdownMenuLabel className="truncate pb-0 text-sm tracking-normal text-foreground normal-case">
            {user.name}
          </DropdownMenuLabel>
        )}
        <DropdownMenuLabel className="text-xs font-normal tracking-normal text-muted-foreground normal-case">
          {t("profileMenuGoTo")}
        </DropdownMenuLabel>
        {SETTINGS_SHORTCUTS.map(({ id, labelKey, icon: Icon }) => (
          <DropdownMenuItem key={id} onSelect={() => go(id)}>
            <Icon aria-hidden="true" />
            {t(labelKey)}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => logout()}>
          <LogOutIcon aria-hidden="true" />
          {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ProfileMenu;
