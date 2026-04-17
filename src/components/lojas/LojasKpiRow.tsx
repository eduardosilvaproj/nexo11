import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Props = { mes: string; lojaId?: string };

function monthRange(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  return {
    inicio: new Date(y, m - 1, 1).toISOString(),
    fim: new Date(y, m, 1).toISOString(),
  };
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function margemColor(m: number) {
  if (m >= 25) return "#12B76A";
  if (m >= 15) return "#E8A020";
  return "#D92D20";
}

function Card({
  borda,
  titulo,
  valor,
  sub,
}: {
  borda: string;
  titulo: string;
  valor: string;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E5E7EB",
        borderTop: `3px solid ${borda}`,
        borderRadius: 8,
        padding: 16,
      }}
    >
      <div style={{ fontSize: 12, color: "#6B7A90", fontWeight: 500 }}>{titulo}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#0D1117", marginTop: 6 }}>{valor}</div>
      {sub && <div style={{ fontSize: 11, color: "#6B7A90", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function LojasKpiRow({ mes, lojaId }: Props) {
  const { inicio, fim } = monthRange(mes);

  const { data } = useQuery({
    queryKey: ["lojas-kpi", mes, lojaId ?? "all"],
    queryFn: async () => {
      const lojasQ = supabase.from("lojas").select("id", { count: "exact", head: true });
      const dreQ = supabase
        .from("vw_contratos_dre")
        .select("valor_venda, margem_realizada")
        .gte("data_criacao", inicio)
        .lt("data_criacao", fim);
      const ativosQ = supabase
        .from("contratos")
        .select("id", { count: "exact", head: true })
        .not("status", "in", "(finalizado)");

      if (lojaId) {
        dreQ.eq("loja_id", lojaId);
        ativosQ.eq("loja_id", lojaId);
      }

      const [{ count: lojasCount }, { data: dre }, { count: ativosCount }] = await Promise.all([
        lojasQ,
        dreQ,
        ativosQ,
      ]);

      let faturamento = 0;
      let sumMW = 0;
      let w = 0;
      (dre ?? []).forEach((r: any) => {
        const v = Number(r.valor_venda ?? 0);
        faturamento += v;
        if (v > 0 && r.margem_realizada != null) {
          sumMW += Number(r.margem_realizada) * v;
          w += v;
        }
      });

      return {
        lojas: lojasCount ?? 0,
        faturamento,
        margem: w > 0 ? sumMW / w : 0,
        ativos: ativosCount ?? 0,
      };
    },
  });

  const lojas = data?.lojas ?? 0;
  const faturamento = data?.faturamento ?? 0;
  const margem = data?.margem ?? 0;
  const ativos = data?.ativos ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card borda="#1E6FBF" titulo="Total de lojas ativas" valor={String(lojas)} />
      <Card borda="#12B76A" titulo="Faturamento da rede" valor={fmtBRL(faturamento)} />
      <Card
        borda={margemColor(margem)}
        titulo="Margem média da rede"
        valor={`${margem.toFixed(1)}%`}
      />
      <Card borda="#E8A020" titulo="Contratos ativos" valor={String(ativos)} />
    </div>
  );
}
