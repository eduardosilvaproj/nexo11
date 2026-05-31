import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Clock, AlertTriangle, CheckCircle2, Users, TrendingUp } from "lucide-react";

interface Props {
  aba: "medicao" | "conferencia";
}

export function TecnicoDashboard({ aba }: Props) {
  const { perfil } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["tecnico-dashboard-stats", aba, perfil?.loja_id],
    queryFn: async () => {
      // Buscar contratos na etapa técnica
      const { data: contratos } = await supabase
        .from("contratos")
        .select("id, status, created_at, updated_at, medicao_responsavel_id, conferencia_responsavel_id")
        .in("status", ["tecnico", "medicao", "conferencia"])
        .eq("loja_id", perfil!.loja_id!);

      const lista = contratos ?? [];
      const hoje = new Date();

      // Contratos atrasados (>7 dias na mesma etapa)
      const atrasados = lista.filter(c => {
        const dias = Math.ceil((hoje.getTime() - new Date(c.updated_at).getTime()) / (1000 * 60 * 60 * 24));
        return dias > 7;
      });

      // Tempo médio na etapa (dias)
      const tempos = lista.map(c =>
        Math.ceil((hoje.getTime() - new Date(c.updated_at).getTime()) / (1000 * 60 * 60 * 24))
      );
      const tempoMedio = tempos.length > 0 ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : 0;

      // Produtividade por técnico
      const responsavelKey = aba === "medicao" ? "medicao_responsavel_id" : "conferencia_responsavel_id";
      const porTecnico = new Map<string, number>();
      lista.forEach(c => {
        const rid = (c as any)[responsavelKey];
        if (rid) porTecnico.set(rid, (porTecnico.get(rid) || 0) + 1);
      });

      // Buscar contratos finalizados recentemente (últimos 30 dias) para taxa de conclusão
      const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { count: concluidos } = await supabase
        .from("contratos")
        .select("*", { count: "exact", head: true })
        .eq("loja_id", perfil!.loja_id!)
        .in("status", ["producao", "entrada", "montagem", "pos_venda", "finalizado"])
        .gte("updated_at", trintaDiasAtras);

      return {
        total: lista.length,
        atrasados: atrasados.length,
        tempoMedio,
        concluidos30d: concluidos || 0,
        porTecnico: Array.from(porTecnico.entries()),
      };
    },
    enabled: !!perfil?.loja_id,
    staleTime: 60000,
  });

  // Buscar nomes dos técnicos
  const tecnicoIds = (stats?.porTecnico ?? []).map(([id]) => id);
  const { data: tecnicos = [] } = useQuery({
    queryKey: ["tecnico-nomes", tecnicoIds],
    enabled: tecnicoIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("pessoas")
        .select("id, nome")
        .in("id", tecnicoIds);
      return data ?? [];
    },
  });

  const tecnicoMap = new Map(tecnicos.map(t => [t.id, t.nome]));

  const cards = [
    {
      label: aba === "medicao" ? "Em medição" : "Em conferência",
      value: stats?.total ?? 0,
      icon: Clock,
      color: "#1E6FBF",
      bg: "#E6F0FF",
    },
    {
      label: "Atrasados (>7 dias)",
      value: stats?.atrasados ?? 0,
      icon: AlertTriangle,
      color: "#E53935",
      bg: "#FEE4E2",
    },
    {
      label: "Tempo médio (dias)",
      value: stats?.tempoMedio ?? 0,
      icon: TrendingUp,
      color: "#E8A020",
      bg: "#FEF3C7",
    },
    {
      label: "Concluídos (30 dias)",
      value: stats?.concluidos30d ?? 0,
      icon: CheckCircle2,
      color: "#12B76A",
      bg: "#D1FAE5",
    },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map(c => (
          <div
            key={c.label}
            className="rounded-xl bg-white p-4 flex items-center gap-3"
            style={{ border: "0.5px solid #E8ECF2" }}
          >
            <div
              className="flex items-center justify-center rounded-lg"
              style={{ width: 40, height: 40, backgroundColor: c.bg }}
            >
              <c.icon className="h-5 w-5" style={{ color: c.color }} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#0D1117" }}>{c.value}</div>
              <div style={{ fontSize: 11, color: "#6B7A90" }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Produtividade por técnico */}
      {(stats?.porTecnico ?? []).length > 0 && (
        <div className="rounded-xl bg-white p-4" style={{ border: "0.5px solid #E8ECF2" }}>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-slate-500" />
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Carga por {aba === "medicao" ? "técnico" : "conferente"}
            </h4>
          </div>
          <div className="space-y-2">
            {(stats?.porTecnico ?? [])
              .sort((a, b) => b[1] - a[1])
              .map(([id, count]) => {
                const maxCount = Math.max(...(stats?.porTecnico ?? []).map(([, c]) => c));
                const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                return (
                  <div key={id} className="flex items-center gap-3">
                    <span className="text-xs text-slate-700 w-32 truncate font-medium">
                      {tecnicoMap.get(id) || "Sem nome"}
                    </span>
                    <div className="flex-1 h-5 rounded bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded transition-all"
                        style={{ width: `${pct}%`, backgroundColor: "#1E6FBF" }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 w-8 text-right">{count}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
