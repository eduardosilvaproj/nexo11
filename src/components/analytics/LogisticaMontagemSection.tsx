import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { SectionCard, MetricTile, EmptyState } from "./SectionCard";
import { Periodo, rangeFromPeriodo } from "./shared";
import { Truck, Package, Wrench, CheckCircle2 } from "lucide-react";

export function LogisticaMontagemSection({ periodo, lojaId }: { periodo: Periodo; lojaId: string }) {
  const { start, end } = rangeFromPeriodo(periodo);

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-logmont", periodo, lojaId],
    queryFn: async () => {
      let expQ = supabase
        .from("expedicoes_almoxarifado")
        .select("id, status, contrato_id, entregue_at, carregado_at, created_at")
        .neq("status", "cancelado");
      if (lojaId !== "all") expQ = expQ.eq("loja_id", lojaId);
      const { data: expedicoes } = await expQ;

      const arr = expedicoes ?? [];
      const separados = arr.filter((e) => e.status === "separado").length;
      const carregados = arr.filter((e) => e.status === "carregado").length;
      const entregues = arr.filter((e) => e.status === "entregue").length;
      const entreguesPeriodo = arr.filter(
        (e) => e.entregue_at && new Date(e.entregue_at) >= start && new Date(e.entregue_at) < end,
      ).length;

      // Status de liberação para montagem por contrato
      const porContrato = new Map<string, { total: number; entregues: number }>();
      arr.forEach((e: Database["public"]["Tables"]["expedicoes_almoxarifado"]["Row"]) => {
        if (!e.contrato_id) return;
        const cur = porContrato.get(e.contrato_id) ?? { total: 0, entregues: 0 };
        cur.total += 1;
        if (e.status === "entregue") cur.entregues += 1;
        porContrato.set(e.contrato_id, cur);
      });
      let liberadas = 0, parciais = 0, aguardando = 0;
      porContrato.forEach((v) => {
        if (v.entregues === v.total) liberadas++;
        else if (v.entregues > 0) parciais++;
        else aguardando++;
      });

      // Agendamentos de montagem
      let agQ = supabase
        .from("agendamentos_montagem")
        .select("id, status, data")
        .gte("data", start.toISOString().slice(0, 10))
        .lt("data", end.toISOString().slice(0, 10));
      const { data: agend } = await agQ;
      const agArr = agend ?? [];
      const agendadas = agArr.filter((a) => a.status === "agendado").length;
      const emExecucao = agArr.filter((a) => a.status === "em_execucao").length;
      const concluidas = agArr.filter((a) => a.status === "concluido").length;

      return {
        separados, carregados, entregues, entreguesPeriodo,
        liberadas, parciais, aguardando,
        agendadas, emExecucao, concluidas, totalAg: agArr.length,
      };
    },
  });

  const d = data;
  const skel = isLoading || !d;

  return (
    <div className="space-y-4">
      <SectionCard title="Logística — Expedições" description="Status dos materiais separados/carregados/entregues">
        {skel ? (
          <div style={{ height: 80 }} className="animate-pulse rounded bg-slate-100" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricTile label="Separados" value={String(d!.separados)} accent="#1E6FBF" icon={<Package className="h-4 w-4" />} />
            <MetricTile label="Carregados" value={String(d!.carregados)} accent="#E8A020" icon={<Truck className="h-4 w-4" />} />
            <MetricTile label="Entregues" value={String(d!.entregues)} accent="#12B76A" icon={<CheckCircle2 className="h-4 w-4" />} />
            <MetricTile label="Entregues no período" value={String(d!.entreguesPeriodo)} accent="#05873C" />
          </div>
        )}
      </SectionCard>

      <SectionCard title="Montagem" description="Status das obras">
        {skel ? (
          <div style={{ height: 80 }} className="animate-pulse rounded bg-slate-100" />
        ) : d!.totalAg === 0 && d!.aguardando === 0 && d!.liberadas === 0 ? (
          <EmptyState message="Sem dados de montagem no período." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <MetricTile label="Liberadas (materiais 100%)" value={String(d!.liberadas)} accent="#12B76A" icon={<CheckCircle2 className="h-4 w-4" />} />
            <MetricTile label="Parcialmente entregues" value={String(d!.parciais)} accent="#E8A020" />
            <MetricTile label="Aguardando materiais" value={String(d!.aguardando)} accent="#E53935" />
            <MetricTile label="Agendadas no período" value={String(d!.agendadas)} accent="#1E6FBF" icon={<Wrench className="h-4 w-4" />} />
            <MetricTile label="Em execução" value={String(d!.emExecucao)} accent="#D85A30" />
            <MetricTile label="Concluídas" value={String(d!.concluidas)} accent="#05873C" />
          </div>
        )}
      </SectionCard>
    </div>
  );
}
