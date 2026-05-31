import { tokens } from "@/lib/design-tokens";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1
          className="font-semibold"
          style={{
            fontSize: tokens.fontSize.pageTitle,
            color: tokens.colors.heading,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="mt-0.5"
            style={{
              fontSize: tokens.fontSize.body,
              color: tokens.colors.muted,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
