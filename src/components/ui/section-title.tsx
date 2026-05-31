import { tokens } from "@/lib/design-tokens";

interface SectionTitleProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function SectionTitle({ children, icon, action }: SectionTitleProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon && (
          <span style={{ color: tokens.colors.muted }}>{icon}</span>
        )}
        <h2
          className="uppercase tracking-wide font-semibold"
          style={{
            fontSize: tokens.fontSize.body,
            color: tokens.colors.body,
          }}
        >
          {children}
        </h2>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
