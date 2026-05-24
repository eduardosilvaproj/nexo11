export type Periodo = "mes_atual" | "mes_anterior" | "ult_3m" | "ult_6m" | "ano_atual";

export function rangeFromPeriodo(p: Periodo): { start: Date; end: Date; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (p) {
    case "mes_atual":
      return { start: new Date(y, m, 1), end: new Date(y, m + 1, 1), label: "Mês atual" };
    case "mes_anterior":
      return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1), label: "Mês anterior" };
    case "ult_3m":
      return { start: new Date(y, m - 2, 1), end: new Date(y, m + 1, 1), label: "Últimos 3 meses" };
    case "ult_6m":
      return { start: new Date(y, m - 5, 1), end: new Date(y, m + 1, 1), label: "Últimos 6 meses" };
    case "ano_atual":
      return { start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1), label: "Ano atual" };
  }
}

export const fmtBRL = (n: number) =>
  (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const fmtBRLAbrev = (v: number) => {
  const abs = Math.abs(v || 0);
  if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1000) return `R$ ${Math.round(v / 1000)}k`;
  return `R$ ${Math.round(v)}`;
};

export const fmtPct = (n: number, digits = 1) =>
  Number.isFinite(n) ? `${n.toFixed(digits)}%` : "—";

export const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
};

export function monthsBetween(start: Date, end: Date): string[] {
  const out: string[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur < end) {
    out.push(monthKey(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}
