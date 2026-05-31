import { useQuery } from "@tanstack/react-query";
import { Trophy, TrendingUp, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "./SectionCard";
import { Periodo, rangeFromPeriodo, fmtBRL, fmtPct } from "./shared";

type Props = { periodo: Periodo };

type LojaMetrics = {
  loja_id: string;
  loja_nome: string;
  faturamento: number;
  contratos: number;
  ticketMedio: number;
  margem: number;
  nps: number | null;
  tempoMedio: number;
};

async function fetchBenchmark(periodo: Periodo): Promise<LojaMetrics[]> {
  const { start, end } = rangeFromPeriodo(periodo);

  // Get all contratos in period grouped by loja
  const { data: contratos } = await (supabase as any)
    .from("vw_contratos_dre")
    .select("id, loja_id, valor_venda, margem_realizada, status, data_criacao, data_finalizacao")
    .gte("data_criacao", start.toISOString())
    .lt("data_criacao", end.toISOString())
    .neq("status", "cancelado");

  const list = contratos ?? [];

  // Get loja names
  const lojaIds = [...new Set(list.map((c: any) => c.loja_id).filter(Boolean))] as string[];
  if (!lojaIds.length) return [];

  const { data: lojas } = await supabase
    .from("lojas")
    .select("id, nome")
    .in("id", lojaIds);
  const lojaMap = new Map((lojas ?? []).map((l) => [l.id, l.nome]));

  // Get NPS per contrato
  const contratoIds = list.map((c: any) => c.id).filter(Boolean) as string[];
  let npsMap = new Map<string, number[]>();
  if (contratoIds.length) {
    const { data: chamados } = await supabase
      .from("chamados_pos_venda")
      .select("contrato_id, nps")
      .in("contrato_id", contratoIds)
      .not("nps", "is", null);
    for (const ch of chamados ?? []) {
      const arr = npsMap.get(ch.contrato_id) ?? [];
      arr.push(Number(ch.nps));
      npsMap.set(ch.contrato_id, arr);
    }
  }

  // Group by loja
  const byLoja = new Map<string, any[]>();
  for (const c of list) {
    const arr = byLoja.get(c.loja_id) ?? [];
    arr.push(c);
    byLoja.set(c.loja_id, arr);
  }

  const metrics: LojaMetrics[] = [];
  for (const [lojaId, items] of byLoja.entries()) {
    const faturamento = items.reduce((s: number, c: any) => s + Number(c.valor_venda || 0), 0);
    const contratos = items.length;
    const ticketMedio = contratos ? faturamento / contratos : 0;
    const margens = items
      .map((c: any) => Number(c.margem_realizada))
      .filter((v: number) => Number.isFinite(v) && v !== 0);
    const margem = margens.length ? margens.reduce((a: number, b: number) => a + b, 0) / margens.length : 0;

    // NPS for this loja
    const lojaContratoIds = items.map((c: any) => c.id).filter(Boolean);
    const npsValues: number[] = [];
    for (const cid of lojaContratoIds) {
      const vals = npsMap.get(cid);
      if (vals) npsValues.push(...vals);
    }
    const nps = npsValues.length ? npsValues.reduce((a, b) => a + b, 0) / npsValues.length : null;

    // Tempo medio
    const tempos = items
      .filter((c: any) => c.data_criacao && c.data_finalizacao)
      .map((c: any) => {
        const d1 = new Date(c.data_criacao).getTime();
        const d2 = new Date(c.data_finalizacao).getTime();
        return (d2 - d1) / (1000 * 60 * 60 * 24);
      })
      .filter((d: number) => d > 0 && d < 365);
    const tempoMedio = tempos.length ? tempos.reduce((a: number, b: number) => a + b, 0) / tempos.length : 0;

    metrics.push({
      loja_id: lojaId,
      loja_nome: lojaMap.get(lojaId) ?? "Loja",
      faturamento,
      contratos,
      ticketMedio,
      margem,
      nps,
      tempoMedio,
    });
  }

  return metrics.sort((a, b) => b.faturamento - a.faturamento);
}

function bestWorst(metrics: LojaMetrics[], key: keyof LojaMetrics) {
  if (!metrics.length) return { best: "", worst: "" };
  const valid = metrics.filter((m) => m[key] != null && Number.isFinite(m[key] as number));
  if (!valid.length) return { best: "", worst: "" };
  const sorted = [...valid].sort((a, b) => Number(b[key]) - Number(a[key]));
  return { best: sorted[0].loja_id, worst: sorted[sorted.length - 1].loja_id };
}

function CellHighlight({ value, lojaId, bestId, worstId }: { value: string; lojaId: string; bestId: string; worstId: string }) {
  let bg = "transparent";
  if (lojaId === bestId) bg = "rgba(18, 183, 106, 0.1)";
  if (lojaId === worstId && bestId !== worstId) bg = "rgba(229, 57, 53, 0.08)";
  let color = "#0D1117";
  if (lojaId === bestId) color = "#12B76A";
  if (lojaId === worstId && bestId !== worstId) color = "#E53935";
  return (
    <span style={{ background: bg, color, padding: "2px 6px", borderRadius: 4, fontWeight: 500 }}>
      {value}
    </span>
  );
}

function RankingCard({ icon, label, loja, value }: { icon: React.ReactNode; label: string; loja: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4" style={{ border: "0.5px solid #E8ECF2", borderTop: "3px solid #12B76A" }}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span style={{ fontSize: 12, color: "#6B7A90" }}>{label}</span>
      </div>
      <p style={{ fontSize: 15, fontWeight: 600, color: "#0D1117" }}>{loja}</p>
      <p style={{ fontSize: 13, color: "#12B76A", fontWeight: 500, marginTop: 2 }}>{value}</p>
    </div>
  );
}

export function BenchmarkLojas({ periodo }: Props) {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["analytics-benchmark", periodo],
    queryFn: () => fetchBenchmark(periodo),
  });

  const list = metrics ?? [];
  const fatBW = bestWorst(list, "faturamento");
  const npsBW = bestWorst(list, "nps");
  const margemBW = bestWorst(list, "margem");
  const ticketBW = bestWorst(list, "ticketMedio");
  const tempoBW = list.length
    ? { best: [...list].sort((a, b) => a.tempoMedio - b.tempoMedio)[0]?.loja_id ?? "", worst: [...list].sort((a, b) => b.tempoMedio - a.tempoMedio)[0]?.loja_id ?? "" }
    : { best: "", worst: "" };

  const maxFat = Math.max(...list.map((m) => m.faturamento), 1);

  const topFat = list[0];
  const topNps = [...list].filter((m) => m.nps != null).sort((a, b) => (b.nps ?? 0) - (a.nps ?? 0))[0];
  const topMargem = [...list].sort((a, b) => b.margem - a.margem)[0];

  if (isLoading) {
    return (
      <SectionCard title="Benchmark entre Lojas">
        <div style={{ fontSize: 13, color: "#6B7A90", padding: 20, textAlign: "center" }}>Carregando...</div>
      </SectionCard>
    );
  }

  if (!list.length) {
    return (
      <SectionCard title="Benchmark entre Lojas">
        <div style={{ fontSize: 13, color: "#6B7A90", padding: 20, textAlign: "center" }}>Sem dados para o período selecionado.</div>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Ranking cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {topFat && (
          <RankingCard
            icon={<Trophy className="h-4 w-4" style={{ color: "#12B76A" }} />}
            label="Maior faturamento"
            loja={topFat.loja_nome}
            value={fmtBRL(topFat.faturamento)}
          />
        )}
        {topNps && (
          <RankingCard
            icon={<Star className="h-4 w-4" style={{ color: "#12B76A" }} />}
            label="Melhor NPS"
            loja={topNps.loja_nome}
            value={topNps.nps != null ? topNps.nps.toFixed(1) : "—"}
          />
        )}
        {topMargem && (
          <RankingCard
            icon={<TrendingUp className="h-4 w-4" style={{ color: "#12B76A" }} />}
            label="Melhor margem"
            loja={topMargem.loja_nome}
            value={fmtPct(topMargem.margem)}
          />
        )}
      </div>

      {/* Comparison table */}
      <SectionCard title="Comparativo entre Lojas" description="Destaque verde = melhor | vermelho = pior">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E8ECF2" }}>
                <th className="text-left py-2 px-2" style={{ color: "#6B7A90", fontWeight: 500, fontSize: 11 }}>Loja</th>
                <th className="text-right py-2 px-2" style={{ color: "#6B7A90", fontWeight: 500, fontSize: 11 }}>Faturamento</th>
                <th className="text-right py-2 px-2" style={{ color: "#6B7A90", fontWeight: 500, fontSize: 11 }}>Contratos</th>
                <th className="text-right py-2 px-2" style={{ color: "#6B7A90", fontWeight: 500, fontSize: 11 }}>Ticket Medio</th>
                <th className="text-right py-2 px-2" style={{ color: "#6B7A90", fontWeight: 500, fontSize: 11 }}>Margem %</th>
                <th className="text-right py-2 px-2" style={{ color: "#6B7A90", fontWeight: 500, fontSize: 11 }}>NPS</th>
                <th className="text-right py-2 px-2" style={{ color: "#6B7A90", fontWeight: 500, fontSize: 11 }}>Tempo Medio</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.loja_id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td className="py-2 px-2 font-medium" style={{ color: "#0D1117" }}>{m.loja_nome}</td>
                  <td className="text-right py-2 px-2">
                    <CellHighlight value={fmtBRL(m.faturamento)} lojaId={m.loja_id} bestId={fatBW.best} worstId={fatBW.worst} />
                  </td>
                  <td className="text-right py-2 px-2" style={{ color: "#0D1117" }}>{m.contratos}</td>
                  <td className="text-right py-2 px-2">
                    <CellHighlight value={fmtBRL(m.ticketMedio)} lojaId={m.loja_id} bestId={ticketBW.best} worstId={ticketBW.worst} />
                  </td>
                  <td className="text-right py-2 px-2">
                    <CellHighlight value={fmtPct(m.margem)} lojaId={m.loja_id} bestId={margemBW.best} worstId={margemBW.worst} />
                  </td>
                  <td className="text-right py-2 px-2">
                    <CellHighlight value={m.nps != null ? m.nps.toFixed(1) : "—"} lojaId={m.loja_id} bestId={npsBW.best} worstId={npsBW.worst} />
                  </td>
                  <td className="text-right py-2 px-2">
                    <CellHighlight value={`${m.tempoMedio.toFixed(0)}d`} lojaId={m.loja_id} bestId={tempoBW.best} worstId={tempoBW.worst} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Bar chart */}
      <SectionCard title="Faturamento por Loja">
        <div className="space-y-2">
          {list.map((m) => (
            <div key={m.loja_id} className="flex items-center gap-3">
              <span className="w-24 truncate" style={{ fontSize: 12, color: "#0D1117" }}>{m.loja_nome}</span>
              <div className="flex-1 h-6 rounded" style={{ background: "#F1F5F9" }}>
                <div
                  className="h-6 rounded"
                  style={{
                    width: `${(m.faturamento / maxFat) * 100}%`,
                    background: "linear-gradient(90deg, #1E6FBF, #3B82F6)",
                    minWidth: 2,
                  }}
                />
              </div>
              <span style={{ fontSize: 12, color: "#6B7A90", minWidth: 80, textAlign: "right" }}>
                {fmtBRL(m.faturamento)}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
