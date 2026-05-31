import { STATUS_COLORS } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  colorScheme?: "success" | "warning" | "error" | "info" | "neutral" | "purple";
  size?: "sm" | "md";
  icon?: React.ReactNode;
}

export function StatusBadge({
  status,
  colorScheme = "neutral",
  size = "sm",
  icon,
}: StatusBadgeProps) {
  const colors = STATUS_COLORS[colorScheme];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap",
        size === "sm" && "text-[10px] px-2 py-0.5",
        size === "md" && "text-xs px-2.5 py-1"
      )}
      style={{
        backgroundColor: colors.bg,
        color: colors.fg,
      }}
    >
      {icon}
      {status}
    </span>
  );
}
