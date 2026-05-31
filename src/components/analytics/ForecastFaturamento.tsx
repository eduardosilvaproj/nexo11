import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Target, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "./SectionCard";
import { Periodo, rangeFromPeriodo, fmtBRL, monthKey, monthLabel } from "./shared";

type Props = { periodo: Periodo; lojaId: string };

const STAGE_PROB: Record<string, number> = {
  comercial: 0.2,
  medicao: 0.4,
  producao: 0.6,
  montagem: 0.8,
  pos_venda: 0.95,
};

type ForecastData = {
  historico: { mes: string; valor: number }[];
  pipeline: { etapa: string; count: number; valorTotal: number; valorPonderado: number }[];
  previsaoPipeline: number;
  previsaoHistorico: number;
  tendenciaPct: number;
  pessimista: number;
  realista: number;
  otimista: number;
};

async function fetchForecast(periodo: Periodo, lojaId: string): Promise<ForecastData> {
  // Last 6 months of revenue
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  let hQ = supabase
    .from("contratos")
    .select("valor_venda, data_criacao, loja_id")
    .gte("data_criacao", sixMonthsAgo.toISOString())
    .lt("data_criacao", endOfMonth.toISOString())
    .neq("status", "cancelado");
  if (lojaId !== "all") hQ = hQ.eq("loja_id", lojaId);
  const { data: contratosHist } = await hQ;

  // Group by month
  const byMonth = new Map<string, number>();
  for (const c of contratosHist ?? []) {
    const mk = monthKey(new Date(c.data_criacao));
    byMonth.set(mk, (byMonth.get(mk) ?? 0) + Number(c.valor_venda || 0));
  }

  // Build sorted history
  const historico: { mes: string; valor: number }[] = [];
  const cur = new Date(sixMonthsAgo);
  while (cur < endOfMonth) {
    const mk = monthKey(cur);
    historico.push({ mes: mk, valor: byMonth.get(mk) ?? 0 });
    cur.setMonth(cur.getMonth() + 1);
  }

  // Pipeline: active contracts by stage
  let pQ = supabase
    .from("contratos")
    .select("id, valor_venda, status, loja_id")
    .in("status", Object.keys(STAGE_PROB));
  if (lojaId !== "all") pQ = pQ.eq("loja_id", lojaId);
  const { data: pipelineContratos } = await pQ;

  const pipelineByStage = new Map<string, { count: number; valorTotal: number }>();
  for (const c of pipelineContratos ?? []) {
    const stage = c.status;
    const entry = pipelineByStage.get(stage) ?? { count: 0, valorTotal: 0 };
    entry.count++;
    entry.valorTotal += Number(c.valor_venda || 0);
    pipelineByStage.set(stage, entry);
  }

  const pipeline = Object.entries(STAGE_PROB).map(([etapa, prob]) => {
    const entry = pipelineByStage.get(etapa) ?? { count: 0, valorTotal: 0 };
    return {
      etapa,
      count: entry.count,
      valorTotal: entry.valorTotal,
      valorPonderado: entry.valorTotal * prob,
    };
  });

  const previsaoPipeline = pipeline.reduce((s, p) => s + p.valorPonderado, 0);

  // Historical average (last 3 months)
  const last3 = historico.slice(-3);
  const previsaoHistorico = last3.length
    ? last3.reduce((s, h) => s + h.valor, 0) / last3.length
    : 0;

  // Trend: month-over-month growth
  const growths: number[] = [];
  for (let i = 1; i < historico.length; i++) {
    if (historico[i - 1].valor > 0) {
      growths.push((historico[i].valor - historico[i - 1].valor) / historico[i - 1].valor);
    }
  }
  const tendenciaPct = growths.length
    ? (growths.reduce((a, b) => a + b, 0) / growths.length) * 100
    : 0;

  // Combine forecasts
  const realista = (previsaoPipeline * 0.5 + previsaoHistorico * 0.5);
  const pessimista = realista * 0.75;
  const otimista = realista * 1.3;

  return {
    historico,
    pipeline,
    previsaoPipeline,
    previsaoHistorico,
    tendenciaPct,
    pessimista,
    realista,
    otimista,
  };
}

function etapaLabel(etapa: string): string {
  const labels: Record<string, string> = {
    comercial: "Comercial",
    medicao: "Medicao",
    producao: "Producao",
    montagem: "Montagem",
    pos_venda: "Pos-venda",
  };
  return labels[etapa] ?? etapa;
}

export function ForecastFaturamento({ periodo, lojaId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-forecast", periodo, lojaId],
    queryFn: () => fetchForecast(periodo, lojaId),
  });

  if (isLoading || !data) {
    return (
      <SectionCard title="Previsao de Faturamento">
        <div style={{ fontSize: 13, color: "#6B7A90", padding: 20, textAlign: "center" }}>Carregando...</div>
      </SectionCard>
    );
  }

  const maxHistVal = Math.max(...data.historico.map((h) => h.valor), data.otimista, 1);

  // Build projection months (next 3)
  const lastMonth = data.historico[data.historico.length - 1];
  const projectionMonths: { mes: string; valor: number }[] = [];
  if (lastMonth) {
    const [y, m] = lastMonth.mes.split("-").map(Number);
    for (let i = 1; i <= 3; i++) {
      const d = new Date(y, m - 1 + i, 1);
      projectionMonths.push({ mes: monthKey(d), valor: data.realista * (1 + (data.tendenciaPct / 100) * (i - 1)) });
    }
  }

  const allMonths = [...data.historico, ...projectionMonths];
  const allMax = Math.max(...allMonths.map((m) => m.valor), 1);

  return (
    <div className="space-y-4">
      {/* Forecast card */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4" style={{ border: "0.5px solid #E8ECF2", borderTop: "3px solid #1E6FBF" }}>
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4" style={{ color: "#1E6FBF" }} />
            <span style={{ fontSize: 12, color: "#6B7A90" }}>Previsao proximo mes</span>
          </div>
          <p style={{ fontSize: 22, fontWeight: 600, color: "#0D1117" }}>{fmtBRL(data.realista)}</p>
          <p style={{ fontSize: 11, color: "#6B7A90", marginTop: 4 }}>
            Tendencia: {data.tendenciaPct >= 0 ? "+" : ""}{data.tendenciaPct.toFixed(1)}% ao mes
          </p>
        </div>

        <div className="rounded-xl bg-white p-4" style={{ border: "0.5px solid #E8ECF2", borderTop: "3px solid #E8A020" }}>
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4" style={{ color: "#E8A020" }} />
            <span style={{ fontSize: 12, color: "#6B7A90" }}>Pipeline ponderado</span>
          </div>
          <p style={{ fontSize: 22, fontWeight: 600, color: "#0D1117" }}>{fmtBRL(data.previsaoPipeline)}</p>
          <p style={{ fontSize: 11, color: "#6B7A90", marginTop: 4 }}>
            Contratos ativos x probabilidade
          </p>
        </div>

        <div className="rounded-xl bg-white p-4" style={{ border: "0.5px solid #E8ECF2", borderTop: "3px solid #12B76A" }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4" style={{ color: "#12B76A" }} />
            <span style={{ fontSize: 12, color: "#6B7A90" }}>Media historica (3m)</span>
          </div>
          <p style={{ fontSize: 22, fontWeight: 600, color: "#0D1117" }}>{fmtBRL(data.previsaoHistorico)}</p>
          <p style={{ fontSize: 11, color: "#6B7A90", marginTop: 4 }}>
            Base para projecao
          </p>
        </div>
      </div>

      {/* Confidence range */}
      <SectionCard title="Faixa de Confianca" description="Cenarios pessimista, realista e otimista">
        <div className="flex items-end gap-1 justify-center" style={{ height: 60 }}>
          <div className="flex flex-col items-center gap-1">
            <span style={{ fontSize: 11, color: "#E53935", fontWeight: 500 }}>{fmtBRL(data.pessimista)}</span>
            <div style={{ width: 60, height: 30, background: "rgba(229,57,53,0.15)", borderRadius: 4 }} />
            <span style={{ fontSize: 10, color: "#6B7A90" }}>Pessimista</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span style={{ fontSize: 13, color: "#1E6FBF", fontWeight: 600 }}>{fmtBRL(data.realista)}</span>
            <div style={{ width: 60, height: 50, background: "rgba(30,111,191,0.2)", borderRadius: 4 }} />
            <span style={{ fontSize: 10, color: "#6B7A90" }}>Realista</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span style={{ fontSize: 11, color: "#12B76A", fontWeight: 500 }}>{fmtBRL(data.otimista)}</span>
            <div style={{ width: 60, height: 40, background: "rgba(18,183,106,0.15)", borderRadius: 4 }} />
            <span style={{ fontSize: 10, color: "#6B7A90" }}>Otimista</span>
          </div>
        </div>
      </SectionCard>

      {/* Line projection chart (div-based) */}
      <SectionCard title="Projecao de Faturamento" description="Historico + 3 meses projetados">
        <div className="flex items-end gap-1" style={{ height: 120 }}>
          {allMonths.map((m, i) => {
            const isProjection = i >= data.historico.length;
            const barHeight = allMax > 0 ? (m.valor / allMax) * 100 : 0;
            return (
              <div key={m.mes} className="flex flex-col items-center flex-1" style={{ minWidth: 0 }}>
                <span style={{ fontSize: 10, color: "#6B7A90", marginBottom: 2 }}>
                  {fmtBRL(m.valor).replace("R$", "").trim()}
                </span>
                <div
                  style={{
                    width: "100%",
                    maxWidth: 36,
                    height: `${barHeight}%`,
                    minHeight: 2,
                    background: isProjection
                      ? "repeating-linear-gradient(45deg, #1E6FBF22, #1E6FBF22 4px, #1E6FBF44 4px, #1E6FBF44 8px)"
                      : "linear-gradient(180deg, #1E6FBF, #3B82F6)",
                    borderRadius: 4,
                    border: isProjection ? "1px dashed #1E6FBF" : "none",
                  }}
                />
                <span style={{ fontSize: 10, color: "#6B7A90", marginTop: 4 }}>
                  {monthLabel(m.mes)}
                </span>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Pipeline breakdown */}
      <SectionCard title="Pipeline por Etapa" description="Valor ponderado pela probabilidade de conversao">
        <div className="space-y-2">
          {data.pipeline.map((p) => (
            <div key={p.etapa} className="flex items-center gap-3">
              <span className="w-20" style={{ fontSize: 12, color: "#0D1117" }}>{etapaLabel(p.etapa)}</span>
              <span style={{ fontSize: 11, color: "#6B7A90", width: 30, textAlign: "center" }}>
                {(STAGE_PROB[p.etapa] * 100).toFixed(0)}%
              </span>
              <div className="flex-1 h-5 rounded" style={{ background: "#F1F5F9" }}>
                <div
                  className="h-5 rounded"
                  style={{
                    width: data.previsaoPipeline > 0 ? `${(p.valorPonderado / data.previsaoPipeline) * 100}%` : "0%",
                    background: `linear-gradient(90deg, #1E6FBF, #3B82F6)`,
                    opacity: STAGE_PROB[p.etapa],
                    minWidth: p.valorPonderado > 0 ? 2 : 0,
                  }}
                />
              </div>
              <span style={{ fontSize: 12, color: "#0D1117", minWidth: 90, textAlign: "right" }}>
                {fmtBRL(p.valorPonderado)}
              </span>
              <span style={{ fontSize: 11, color: "#6B7A90", minWidth: 30, textAlign: "right" }}>
                ({p.count})
              </span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
