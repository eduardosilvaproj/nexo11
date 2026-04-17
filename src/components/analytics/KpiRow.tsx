import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Props = { mes: string; lojaId: string };

function monthRange(value: string) {
  const [y, m] = value.split("-").map(Number);
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) };
}
function prevMonth(value: string) {
  const [y, m] = value.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const pctDelta = (cur: number, prev: number) => {
  if (!prev) return null;
  return ((cur - prev) / prev) * 100;
};

type Metrics = {
  faturamento: number;
  margemMedia: number;
  finalizados: number;
  ticketMedio: number;
  nps: number | null;
  npsCount: number;
  leadsTotal: number;
  leadsConv: number;
};

async function fetchMetrics(mes: string, lojaId: string): Promise<Metrics> {
  const { start, end } = monthRange(mes);
  let q = supabase
    .from("vw_contratos_dre")
    .select("id, valor_venda, margem_realizada, status, data_finalizacao, data_criacao, loja_id")
    .gte("data_criacao", start.toISOString())
    .lt("data_criacao", end.toISOString());
  if (lojaId !== "all") q = q.eq("loja_id", lojaId);
  const { data: contratos } = await q;

  const list = contratos ?? [];
  const finalizadosList = list.filter((c) => c.status === "finalizado");
  const faturamento = list.reduce((s, c) => s + Number(c.valor_venda || 0), 0);
  const margens = list
    .map((c) => Number(c.margem_realizada))
    .filter((v) => Number.isFinite(v) && v !== 0);
  const margemMedia = margens.length ? margens.reduce((a, b) => a + b, 0) / margens.length : 0;
  const ticketMedio = list.length ? faturamento / list.length : 0;

  // NPS
  const ids = list.map((c) => c.id).filter(Boolean) as string[];
  let nps: number | null = null;
  let npsCount = 0;
  if (ids.length) {
    const { data: chamados } = await supabase
      .from("chamados_pos_venda")
      .select("nps, contrato_id")
      .in("contrato_id", ids)
      .not("nps", "is", null);
    const notas = (chamados ?? []).map((c) => Number(c.nps)).filter((n) => Number.isFinite(n));
    npsCount = notas.length;
    nps = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null;
  }

  // Leads
  let lq = supabase
    .from("leads")
    .select("status, data_entrada, loja_id")
    .gte("data_entrada", start.toISOString())
    .lt("data_entrada", end.toISOString());
  if (lojaId !== "all") lq = lq.eq("loja_id", lojaId);
  const { data: leads } = await lq;
  const leadsTotal = leads?.length ?? 0;
  const leadsConv = (leads ?? []).filter((l) => l.status === "convertido").length;

  return {
    faturamento,
    margemMedia,
    finalizados: finalizadosList.length,
    ticketMedio,
    nps,
    npsCount,
    leadsTotal,
    leadsConv,
  };
}

function npsColor(n: number | null) {
  if (n == null) return "#1E6FBF";
  if (n >= 8) return "#12B76A";
  if (n >= 6) return "#E8A020";
  return "#E53935";
}
function margemColor(m: number) {
  if (m >= 25) return "#12B76A";
  if (m >= 15) return "#E8A020";
  return "#E53935";
}

function Delta({ value, suffix = "%" }: { value: number | null; suffix?: string }) {
  if (value == null || !Number.isFinite(value)) {
    return <span style={{ fontSize: 12, color: "#6B7A90" }}>—</span>;
  }
  const up = value >= 0;
  return (
    <span style={{ fontSize: 12, color: up ? "#12B76A" : "#E53935", fontWeight: 600 }}>
      {up ? "▲" : "▼"} {up ? "+" : ""}{value.toFixed(0)}{suffix}
    </span>
  );
}

function Card({
  label,
  value,
  delta,
  subtext,
  topColor,
}: {
  label: string;
  value: string;
  delta?: React.ReactNode;
  subtext?: React.ReactNode;
  topColor: string;
}) {
  return (
    <div
      className="rounded-xl bg-white p-4"
      style={{ border: "0.5px solid #E8ECF2", borderTop: `3px solid ${topColor}` }}
    >
      <p style={{ fontSize: 12, color: "#6B7A90" }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 600, color: "#0D1117", marginTop: 6 }}>{value}</p>
      <div style={{ marginTop: 6 }}>{delta ?? subtext}</div>
    </div>
  );
}

export function KpiRow({ mes, lojaId }: Props) {
  const { data: cur } = useQuery({
    queryKey: ["analytics-kpi", mes, lojaId],
    queryFn: () => fetchMetrics(mes, lojaId),
  });
  const { data: prev } = useQuery({
    queryKey: ["analytics-kpi", prevMonth(mes), lojaId],
    queryFn: () => fetchMetrics(prevMonth(mes), lojaId),
  });

  const c = cur;
  const p = prev;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
      <Card
        label="Faturamento do mês"
        value={fmtBRL(c?.faturamento ?? 0)}
        delta={<Delta value={c && p ? pctDelta(c.faturamento, p.faturamento) : null} />}
        topColor="#1E6FBF"
      />
      <Card
        label="Margem média realizada"
        value={c ? `${c.margemMedia.toFixed(1)}%` : "—%"}
        delta={<Delta value={c && p ? c.margemMedia - p.margemMedia : null} suffix=" pp" />}
        topColor={margemColor(c?.margemMedia ?? 0)}
      />
      <Card
        label="Contratos finalizados"
        value={String(c?.finalizados ?? 0)}
        delta={
          <span style={{ fontSize: 12, color: "#6B7A90" }}>
            {c && p
              ? `${c.finalizados - p.finalizados >= 0 ? "+" : ""}${c.finalizados - p.finalizados} vs mês anterior`
              : "—"}
          </span>
        }
        topColor="#1E6FBF"
      />
      <Card
        label="Ticket médio"
        value={fmtBRL(c?.ticketMedio ?? 0)}
        delta={<Delta value={c && p ? pctDelta(c.ticketMedio, p.ticketMedio) : null} />}
        topColor="#E8A020"
      />
      <Card
        label="NPS médio"
        value={c?.nps != null ? c.nps.toFixed(1) : "—"}
        subtext={
          <span style={{ fontSize: 12, color: "#6B7A90" }}>
            {c?.npsCount ?? 0} avaliações
          </span>
        }
        topColor={npsColor(c?.nps ?? null)}
      />
      <Card
        label="Taxa de conversão de leads"
        value={
          c && c.leadsTotal
            ? `${((c.leadsConv / c.leadsTotal) * 100).toFixed(0)}%`
            : "0%"
        }
        subtext={
          <span style={{ fontSize: 12, color: "#6B7A90" }}>
            {c?.leadsTotal ?? 0} leads / {c?.leadsConv ?? 0} convertidos
          </span>
        }
        topColor="#E8A020"
      />
    </div>
  );
}
