import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Clock, Star, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Chamado {
  id: string;
  status: string;
  nps: number | null;
  created_at: string;
  resolved_at: string | null;
}

export default function PosVendaDashboard() {
  const { perfil } = useAuth();

  const { data: chamados = [] } = useQuery({
    queryKey: ["posvenda-dashboard", perfil?.loja_id],
    queryFn: async () => {
      const query = (supabase as any)
        .from("chamados_pos_venda")
        .select("id, status, nps, created_at, resolved_at");
      if (perfil?.loja_id) {
        query.eq("loja_id", perfil.loja_id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Chamado[];
    },
    enabled: !!perfil,
  });

  const metrics = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Chamados abertos
    const abertos = chamados.filter(
      (c) => c.status === "aberto" || c.status === "em_andamento"
    ).length;

    // Tempo médio de resolução (dias)
    const resolvidos = chamados.filter(
      (c) => c.status === "resolvido" && c.resolved_at
    );
    let tempoMedio = 0;
    if (resolvidos.length > 0) {
      const totalDias = resolvidos.reduce((acc, c) => {
        const created = new Date(c.created_at).getTime();
        const resolved = new Date(c.resolved_at!).getTime();
        return acc + (resolved - created) / (1000 * 60 * 60 * 24);
      }, 0);
      tempoMedio = totalDias / resolvidos.length;
    }

    // NPS médio (últimos 30 dias)
    const comNps = chamados.filter(
      (c) => c.nps !== null && new Date(c.created_at) >= thirtyDaysAgo
    );
    const npsMedio =
      comNps.length > 0
        ? comNps.reduce((acc, c) => acc + (c.nps ?? 0), 0) / comNps.length
        : 0;

    // Taxa de resolução (últimos 30 dias)
    const ultimos30 = chamados.filter(
      (c) => new Date(c.created_at) >= thirtyDaysAgo
    );
    const resolvidosUltimos30 = ultimos30.filter(
      (c) => c.status === "resolvido"
    ).length;
    const taxaResolucao =
      ultimos30.length > 0
        ? (resolvidosUltimos30 / ultimos30.length) * 100
        : 0;

    // Chamados abertos por semana (últimas 4 semanas)
    const weeks: number[] = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      weeks[3 - i] = chamados.filter((c) => {
        const d = new Date(c.created_at);
        return (
          d >= weekStart &&
          d < weekEnd &&
          (c.status === "aberto" || c.status === "em_andamento")
        );
      }).length;
    }

    return { abertos, tempoMedio, npsMedio, taxaResolucao, weeks };
  }, [chamados]);

  const maxWeek = Math.max(...metrics.weeks, 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Chamados Abertos */}
        <div
          className="rounded-xl bg-white p-5"
          style={{ border: "0.5px solid #E8ECF2", borderTop: "3px solid #E53935" }}
        >
          <div className="flex items-center gap-2">
            <BarChart3 size={14} color="#6B7A90" />
            <span style={{ fontSize: 11, color: "#6B7A90", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Chamados Abertos
            </span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 600, color: "#0D1117", marginTop: 6 }}>
            {metrics.abertos}
          </div>
        </div>

        {/* Tempo Médio Resolução */}
        <div
          className="rounded-xl bg-white p-5"
          style={{ border: "0.5px solid #E8ECF2", borderTop: "3px solid #E8A020" }}
        >
          <div className="flex items-center gap-2">
            <Clock size={14} color="#6B7A90" />
            <span style={{ fontSize: 11, color: "#6B7A90", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Tempo Médio Resolução
            </span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 600, color: "#0D1117", marginTop: 6 }}>
            {metrics.tempoMedio.toFixed(1)}d
          </div>
        </div>

        {/* NPS Médio */}
        <div
          className="rounded-xl bg-white p-5"
          style={{ border: "0.5px solid #E8ECF2", borderTop: "3px solid #534AB7" }}
        >
          <div className="flex items-center gap-2">
            <Star size={14} color="#6B7A90" />
            <span style={{ fontSize: 11, color: "#6B7A90", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              NPS Médio (30d)
            </span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 600, color: "#0D1117", marginTop: 6 }}>
            {metrics.npsMedio.toFixed(1)}
          </div>
        </div>

        {/* Taxa de Resolução */}
        <div
          className="rounded-xl bg-white p-5"
          style={{ border: "0.5px solid #E8ECF2", borderTop: "3px solid #05873C" }}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} color="#6B7A90" />
            <span style={{ fontSize: 11, color: "#6B7A90", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Taxa de Resolução (30d)
            </span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 600, color: "#05873C", marginTop: 6 }}>
            {metrics.taxaResolucao.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Mini trend - chamados abertos por semana */}
      <div
        className="rounded-xl bg-white p-5"
        style={{ border: "0.5px solid #E8ECF2", borderTop: "3px solid #1E6FBF" }}
      >
        <div style={{ fontSize: 11, color: "#6B7A90", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>
          Chamados Abertos por Semana (últimas 4 semanas)
        </div>
        <div className="flex items-end gap-3" style={{ height: 60 }}>
          {metrics.weeks.map((count, i) => (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <span style={{ fontSize: 11, color: "#0D1117", fontWeight: 500 }}>{count}</span>
              <div
                className="w-full rounded-sm"
                style={{
                  height: `${Math.max((count / maxWeek) * 44, 4)}px`,
                  backgroundColor: "#1E6FBF",
                  opacity: 0.7 + (i * 0.1),
                }}
              />
              <span style={{ fontSize: 10, color: "#6B7A90" }}>S{i + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
