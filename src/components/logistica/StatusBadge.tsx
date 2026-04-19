type StatusVisual = "a_agendar" | "agendado" | "em_rota" | "entregue" | "reagendado";

const MAP: Record<StatusVisual, { bg: string; fg: string; label: string }> = {
  a_agendar: { bg: "#E5E7EB", fg: "#475569", label: "A agendar" },
  agendado:  { bg: "#E6F3FF", fg: "#1E6FBF", label: "Agendado" },
  em_rota:   { bg: "#FEEDD3", fg: "#C2701E", label: "Em rota" },
  entregue:  { bg: "#D1FAE5", fg: "#05873C", label: "Entregue" },
  reagendado:{ bg: "#EDE9FE", fg: "#6D28D9", label: "Reagendado" },
};

export function statusVisualMeta(s: StatusVisual) {
  return MAP[s] ?? MAP.a_agendar;
}

export function StatusBadge({ status }: { status: StatusVisual }) {
  const m = statusVisualMeta(status);
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5"
      style={{ backgroundColor: m.bg, color: m.fg, fontSize: 10, fontWeight: 500 }}
    >
      {m.label}
    </span>
  );
}

export type { StatusVisual };
