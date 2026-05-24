import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard, MetricTile, EmptyState } from "./SectionCard";
import { Clock, AlertTriangle } from "lucide-react";

const ETAPAS: { key: string; label: string; cor: string }[] = [
  { key: "comercial", label: "Comercial", cor: "#1E6FBF" },
  { key: "tecnico", label: "Técnico (medição/conferência)", cor: "#534AB7" },
  { key: "producao", label: "Produção", cor: "#D85A30" },
  { key: "logistica", label: "Logística", cor: "#12B76A" },
  { key: "montagem", label: "Montagem", cor: "#1D9E75" },
  { key: "pos_venda", label: "Pós-venda", cor: "#E8A020" },
  { key: "finalizado", label: "Finalizado", cor: "#05873C" },
];

const DIAS_PARADO_LIMITE = 14;

export function OperacionalSection({ lojaId }: { lojaId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-operacional", lojaId],
    queryFn: async () => {
      let q = supabase.from("contratos").select("id, status, updated_at, cliente_nome");
      if (lojaId !== "all") q = q.eq("loja_id", lojaId);
      const { data } = await q;
      const arr = data ?? [];
      const counts: Record<string, number> = {};
      arr.forEach((c: any) => (counts[c.status] = (counts[c.status] ?? 0) + 1));

      const hoje = Date.now();
      const parados = arr
        .filter((c: any) => c.status !== "finalizado" && c.status !== "cancelado")
        .map((c: any) => {
          const dias = c.updated_at
            ? Math.floor((hoje - new Date(c.updated_at).getTime()) / 86400000)
            : 0;
          return { id: c.id, cliente: c.cliente_nome, status: c.status, dias };
        })
        .filter((c) => c.dias >= DIAS_PARADO_LIMITE)
        .sort((a, b) => b.dias - a.dias)
        .slice(0, 10);

      return { counts, parados, ativos: arr.filter((c: any) => c.status !== "finalizado" && c.status !== "cancelado").length };
    },
  });

  const d = data;
  const skel = isLoading || !d;
  const rows = ETAPAS.map((e) => ({ ...e, valor: d?.counts[e.key] ?? 0 }));
  const max = Math.max(1, ...rows.map((r) => r.valor));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricTile label="Contratos ativos" value={skel ? "—" : String(d!.ativos)} accent="#1E6FBF" icon={<Clock className="h-4 w-4" />} />
        <MetricTile label={`Parados há ${DIAS_PARADO_LIMITE}+ dias`} value={skel ? "—" : String(d!.parados.length)} accent="#E53935" icon={<AlertTriangle className="h-4 w-4" />} />
        <MetricTile label="Finalizados" value={skel ? "—" : String(d?.counts["finalizado"] ?? 0)} accent="#05873C" />
      </div>

      <SectionCard title="Pipeline operacional" description="Distribuição de contratos por etapa">
        {skel ? (
          <div style={{ height: 200 }} className="animate-pulse rounded bg-slate-100" />
        ) : (
          <ul className="space-y-2.5">
            {rows.map((r) => (
              <li key={r.key} className="flex items-center gap-3">
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.cor, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "#0D1117", width: 180, flexShrink: 0 }}>{r.label}</span>
                <div style={{ flex: 1, height: 8, background: "#F1F4F8", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${(r.valor / max) * 100}%`, height: "100%", background: r.cor, borderRadius: 4 }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#0D1117", width: 40, textAlign: "right" }}>
                  {r.valor}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Contratos parados" description={`Mais de ${DIAS_PARADO_LIMITE} dias sem atualização`}>
        {skel ? (
          <div style={{ height: 120 }} className="animate-pulse rounded bg-slate-100" />
        ) : d!.parados.length === 0 ? (
          <EmptyState message="Nenhum contrato parado além do limite. ✓" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: 13 }}>
              <thead>
                <tr style={{ color: "#6B7A90", fontSize: 11, textTransform: "uppercase" }}>
                  <th className="px-3 py-2 text-left font-medium">Cliente</th>
                  <th className="px-3 py-2 text-left font-medium">Etapa</th>
                  <th className="px-3 py-2 text-right font-medium">Dias parado</th>
                </tr>
              </thead>
              <tbody>
                {d!.parados.map((c) => (
                  <tr key={c.id} style={{ borderTop: "1px solid #EEF1F5" }}>
                    <td className="px-3 py-2 text-[#0D1117]">{c.cliente}</td>
                    <td className="px-3 py-2 text-[#6B7A90]">{ETAPAS.find((e) => e.key === c.status)?.label ?? c.status}</td>
                    <td className="px-3 py-2 text-right font-medium text-[#E53935]">{c.dias} dias</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
