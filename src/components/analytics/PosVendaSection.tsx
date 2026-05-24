import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard, MetricTile, EmptyState } from "./SectionCard";
import { Periodo, rangeFromPeriodo, fmtPct } from "./shared";
import { MessageCircle, CheckCircle2, Clock, Star } from "lucide-react";

export function PosVendaSection({ periodo, lojaId }: { periodo: Periodo; lojaId: string }) {
  const { start, end } = rangeFromPeriodo(periodo);

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-posvenda", periodo, lojaId],
    queryFn: async () => {
      // contracts of this loja used to filter chamados
      let cids: string[] | null = null;
      if (lojaId !== "all") {
        const { data: cs } = await supabase.from("contratos").select("id").eq("loja_id", lojaId);
        cids = (cs ?? []).map((c) => c.id);
        if (cids.length === 0) {
          return { abertos: 0, andamento: 0, resolvidos: 0, novosPeriodo: 0, nps: null as number | null, npsCount: 0, tempoMedio: null as number | null };
        }
      }
      let q = supabase
        .from("chamados_pos_venda")
        .select("status, nps, data_abertura, data_fechamento");
      if (cids) q = q.in("contrato_id", cids);
      const { data } = await q;
      const arr = data ?? [];

      const abertos = arr.filter((c) => c.status === "aberto").length;
      const andamento = arr.filter((c) => c.status === "em_andamento").length;
      const resolvidos = arr.filter((c) => c.status === "resolvido").length;
      const novosPeriodo = arr.filter(
        (c) => c.data_abertura && new Date(c.data_abertura) >= start && new Date(c.data_abertura) < end,
      ).length;

      const notas = arr.map((c) => Number(c.nps)).filter((n) => Number.isFinite(n) && n >= 0);
      const nps = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null;

      const resolvidosComDatas = arr.filter((c) => c.status === "resolvido" && c.data_abertura && c.data_fechamento);
      const tempoMedio = resolvidosComDatas.length
        ? resolvidosComDatas.reduce((s, c) => {
            const d = (new Date(c.data_fechamento!).getTime() - new Date(c.data_abertura).getTime()) / 86400000;
            return s + Math.max(0, d);
          }, 0) / resolvidosComDatas.length
        : null;

      return { abertos, andamento, resolvidos, novosPeriodo, nps, npsCount: notas.length, tempoMedio };
    },
  });

  const d = data;
  const skel = isLoading || !d;
  const semDados = d && d.abertos === 0 && d.andamento === 0 && d.resolvidos === 0;

  return (
    <SectionCard title="Pós-venda" description="Chamados, NPS e tempo de resolução">
      {skel ? (
        <div style={{ height: 80 }} className="animate-pulse rounded bg-slate-100" />
      ) : semDados ? (
        <EmptyState message="Ainda não há dados suficientes de pós-venda para este período." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MetricTile label="Abertos" value={String(d!.abertos)} accent="#E53935" icon={<MessageCircle className="h-4 w-4" />} />
          <MetricTile label="Em andamento" value={String(d!.andamento)} accent="#E8A020" icon={<Clock className="h-4 w-4" />} />
          <MetricTile label="Resolvidos" value={String(d!.resolvidos)} accent="#12B76A" icon={<CheckCircle2 className="h-4 w-4" />} />
          <MetricTile label="Novos no período" value={String(d!.novosPeriodo)} accent="#1E6FBF" />
          <MetricTile
            label="NPS médio"
            value={d!.nps != null ? d!.nps.toFixed(1) : "—"}
            hint={`${d!.npsCount} avaliações`}
            accent="#534AB7"
            icon={<Star className="h-4 w-4" />}
          />
          <MetricTile
            label="Tempo médio de resolução"
            value={d!.tempoMedio != null ? `${d!.tempoMedio.toFixed(1)}d` : "—"}
            accent="#1D9E75"
          />
        </div>
      )}
    </SectionCard>
  );
}
