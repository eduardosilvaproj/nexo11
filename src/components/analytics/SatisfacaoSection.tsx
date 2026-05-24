import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard, MetricTile, EmptyState } from "./SectionCard";
import { Periodo, rangeFromPeriodo } from "./shared";
import { Star } from "lucide-react";

export function SatisfacaoSection({ periodo, lojaId }: { periodo: Periodo; lojaId: string }) {
  const { start, end } = rangeFromPeriodo(periodo);

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-satisfacao", periodo, lojaId],
    queryFn: async () => {
      let q = supabase
        .from("cliente_pesquisas")
        .select("nota, status, classificacao, etapa")
        .eq("status", "respondida")
        .gte("respondida_em", start.toISOString())
        .lt("respondida_em", end.toISOString());
      
      if (lojaId !== "all") q = q.eq("loja_id", lojaId);
      
      const { data } = await q;
      const arr = data ?? [];
      
      const notas = arr.filter(p => p.nota !== null).map(p => p.nota!);
      const media = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : 0;
      
      const promotores = arr.filter(p => p.classificacao === "promotor").length;
      const detratores = arr.filter(p => p.classificacao === "detrator").length;
      const neutros = arr.filter(p => p.classificacao === "neutro").length;
      
      const nps = arr.length ? ((promotores - detratores) / arr.length) * 100 : 0;

      return {
        media,
        nps,
        total: arr.length,
        promotores,
        detratores,
        neutros
      };
    },
  });

  const d = data;
  const skel = isLoading || !d;
  const semDados = d && d.total === 0;

  return (
    <SectionCard title="Satisfação & NPS" description="Avaliações e feedback dos clientes">
      {skel ? (
        <div style={{ height: 80 }} className="animate-pulse rounded bg-slate-100" />
      ) : semDados ? (
        <EmptyState message="Ainda não há dados de satisfação para este período." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricTile label="NPS" value={`${d!.nps.toFixed(1)}%`} accent="#534AB7" icon={<Star className="h-4 w-4" />} />
          <MetricTile label="Média de nota" value={d!.media.toFixed(1)} accent="#12B76A" />
          <MetricTile label="Total avaliações" value={String(d!.total)} accent="#1E6FBF" />
          <div className="grid grid-cols-3 gap-1">
             <div className="text-center"><p className="text-[10px] text-slate-500">Prom</p><p className="font-bold text-green-600">{d!.promotores}</p></div>
             <div className="text-center"><p className="text-[10px] text-slate-500">Neut</p><p className="font-bold text-yellow-600">{d!.neutros}</p></div>
             <div className="text-center"><p className="text-[10px] text-slate-500">Detr</p><p className="font-bold text-red-600">{d!.detratores}</p></div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
