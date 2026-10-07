import { cn } from "@/lib/utils";

// Inicial del nombre en un circulo (decorativo: el nombre siempre va al lado).
function UserAvatar({ name, className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full border border-fg/10 bg-fg/[0.06] text-base font-medium text-[color:var(--text-2)] uppercase",
        className,
      )}
    >
      {name?.trim().charAt(0) || "?"}
    </span>
  );
}

export default UserAvatar;
