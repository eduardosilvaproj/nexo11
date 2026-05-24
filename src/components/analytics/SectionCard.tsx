import { ReactNode } from "react";

export function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white p-5" style={{ border: "0.5px solid #E8ECF2" }}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0D1117" }}>{title}</h3>
          {description && (
            <p style={{ fontSize: 12, color: "#6B7A90", marginTop: 2 }}>{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function MetricTile({
  label,
  value,
  hint,
  accent = "#1E6FBF",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
  icon?: ReactNode;
}) {
  return (
    <div
      className="rounded-xl bg-white p-4"
      style={{ border: "0.5px solid #E8ECF2", borderTop: `3px solid ${accent}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p style={{ fontSize: 12, color: "#6B7A90" }}>{label}</p>
          <p style={{ fontSize: 22, fontWeight: 600, color: "#0D1117", marginTop: 6 }}>{value}</p>
          {hint && <p style={{ fontSize: 11, color: "#6B7A90", marginTop: 4 }}>{hint}</p>}
        </div>
        {icon && <div style={{ color: accent }}>{icon}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div
      className="rounded-md px-4 py-8 text-center"
      style={{ background: "#F8FAFC", border: "1px dashed #CBD5E1", fontSize: 13, color: "#64748B" }}
    >
      {message}
    </div>
  );
}
