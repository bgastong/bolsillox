import { cn } from "@/lib/utils";

// Inicial del nombre en un circulo (decorativo: el nombre siempre va al lado).
function UserAvatar({ name, className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 font-display text-base font-bold text-primary uppercase",
        className,
      )}
    >
      {name?.trim().charAt(0) || "?"}
    </span>
  );
}

export default UserAvatar;
