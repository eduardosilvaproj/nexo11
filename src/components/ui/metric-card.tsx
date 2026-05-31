import { tokens } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  accentColor?: string;
  trend?: { value: number; positive: boolean };
  className?: string;
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  accentColor,
  trend,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-white p-4 md:p-5 transition-shadow hover:shadow-md",
        className
      )}
      style={{
        border: tokens.colors.card.border,
        borderTop: accentColor
          ? `3px solid ${accentColor}`
          : undefined,
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span
            className="uppercase tracking-wider"
            style={{
              fontSize: tokens.fontSize.label,
              color: tokens.colors.muted,
            }}
          >
            {label}
          </span>
          <span
            className="mt-1.5 font-semibold"
            style={{
              fontSize: tokens.fontSize.kpiValue,
              color: tokens.colors.heading,
            }}
          >
            {value}
          </span>
          {trend && (
            <span
              className="mt-1 text-xs font-medium"
              style={{
                color: trend.positive
                  ? tokens.colors.accent.green
                  : tokens.colors.accent.red,
              }}
            >
              {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </span>
          )}
        </div>
        {Icon && (
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{
              backgroundColor: accentColor
                ? `${accentColor}15`
                : `${tokens.colors.accent.blue}15`,
              color: accentColor || tokens.colors.accent.blue,
            }}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
