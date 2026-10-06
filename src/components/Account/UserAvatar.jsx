import { cn } from "@/lib/utils";

// Inicial del nombre en un circulo (decorativo: el nombre siempre va al lado).
function UserAvatar({ name, className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(135deg,#2b2e33,#16181b)] text-base font-medium text-[color:var(--text-2)] uppercase",
        className,
      )}
    >
      {name?.trim().charAt(0) || "?"}
    </span>
  );
}

export default UserAvatar;
