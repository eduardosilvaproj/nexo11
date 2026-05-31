import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock, CheckCircle2, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PedidoTerc {
  id: string;
  status: string;
  data_prevista: string | null;
  created_at: string;
}

interface OrdemInterna {
  id: string;
  status: string;
  data_prevista: string | null;
  created_at: string;
}

function KpiCard({ label, value, color, icon: Icon }: { label: string; value: string | number; color: string; icon: React.ElementType }) {
  return (
    <div className="rounded-xl bg-white p-5" style={{ border: "0.5px solid #E8ECF2", borderTop: `3px solid ${color}` }}>
      <div className="flex items-center gap-2">
        <Icon size={14} style={{ color }} />
        <span style={{ fontSize: 11, color: "#6B7A90", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 600, color: "#0D1117", marginTop: 6 }}>{value}</div>
    </div>
  );
}

function AlertaItem({ cliente, dias, tipo }: { cliente: string; dias: number; tipo: string }) {
  const atrasado = dias < 0;
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: atrasado ? "#FEE4E2" : "#FEF3C7" }}>
      <div className="flex items-center gap-2">
        <AlertTriangle size={13} style={{ color: atrasado ? "#E53935" : "#E8A020" }} />
        <span style={{ fontSize: 13, color: "#0D1117" }}>{cliente}</span>
        <span className="rounded-full px-2 py-0.5" style={{ fontSize: 11, backgroundColor: atrasado ? "#E53935" : "#E8A020", color: "#fff" }}>
          {tipo === "terceirizada" ? "Terc." : "Interna"}
        </span>
      </div>
      <span style={{ fontSize: 12, fontWeight: 500, color: atrasado ? "#E53935" : "#E8A020" }}>
        {atrasado ? `${Math.abs(dias)}d atrasado` : `${dias}d restantes`}
      </span>
    </div>
  );
}

export function ProducaoDashboard() {
  const { perfil } = useAuth();

  const { data: terceirizados } = useQuery({
    queryKey: ["producao-dashboard-terc"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("producao_terceirizada")
        .select("id, status, data_prevista, created_at, cliente_nome");
      if (error) throw error;
      return (data ?? []) as (PedidoTerc & { cliente_nome?: string })[];
    },
  });

  const { data: internas } = useQuery({
    queryKey: ["producao-dashboard-interna"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("producao_interna")
        .select("id, status, data_prevista, created_at, cliente_nome");
      if (error) throw error;
      return (data ?? []) as (OrdemInterna & { cliente_nome?: string })[];
    },
  });

  const metrics = useMemo(() => {
    const terc = terceirizados ?? [];
    const int = internas ?? [];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Total em produção (not finished)
    const emProducaoTerc = terc.filter((p) => p.status !== "pronto_retirada").length;
    const emProducaoInt = int.filter((p) => p.status !== "concluido").length;
    const totalEmProducao = emProducaoTerc + emProducaoInt;

    // Atrasados
    const atrasadosTerc = terc.filter((p) => {
      if (p.status === "pronto_retirada") return false;
      if (!p.data_prevista) return false;
      const d = new Date(p.data_prevista);
      d.setHours(0, 0, 0, 0);
      return d < hoje;
    });
    const atrasadosInt = int.filter((p) => {
      if (p.status === "concluido") return false;
      if (!p.data_prevista) return false;
      const d = new Date(p.data_prevista);
      d.setHours(0, 0, 0, 0);
      return d < hoje;
    });
    const totalAtrasados = atrasadosTerc.length + atrasadosInt.length;

    // Tempo médio de fabricação (concluídos)
    const concluidosTerc = terc.filter((p) => p.status === "pronto_retirada");
    const concluidosInt = int.filter((p) => p.status === "concluido");
    const allConcluidos = [...concluidosTerc, ...concluidosInt];
    let tempoMedio = 0;
    if (allConcluidos.length > 0) {
      const totalDias = allConcluidos.reduce((acc, p) => {
        const created = new Date(p.created_at);
        const diff = Math.round((hoje.getTime() - created.getTime()) / 86400000);
        return acc + Math.max(diff, 1);
      }, 0);
      tempoMedio = Math.round(totalDias / allConcluidos.length);
    }

    // Taxa de conclusão (últimos 30 dias)
    const trintaDias = new Date(hoje);
    trintaDias.setDate(trintaDias.getDate() - 30);
    const recentesTerc = terc.filter((p) => new Date(p.created_at) >= trintaDias);
    const recentesInt = int.filter((p) => new Date(p.created_at) >= trintaDias);
    const totalRecentes = recentesTerc.length + recentesInt.length;
    const concluidosRecentes = recentesTerc.filter((p) => p.status === "pronto_retirada").length +
      recentesInt.filter((p) => p.status === "concluido").length;
    const taxaConclusao = totalRecentes > 0 ? Math.round((concluidosRecentes / totalRecentes) * 100) : 0;

    // Alertas de prazo (<3 dias ou atrasados)
    type Alerta = { cliente: string; dias: number; tipo: string };
    const alertas: Alerta[] = [];

    terc.forEach((p) => {
      if (p.status === "pronto_retirada" || !p.data_prevista) return;
      const d = new Date(p.data_prevista);
      d.setHours(0, 0, 0, 0);
      const dias = Math.round((d.getTime() - hoje.getTime()) / 86400000);
      if (dias < 3) {
        alertas.push({ cliente: p.cliente_nome || p.id.slice(0, 8), dias, tipo: "terceirizada" });
      }
    });

    int.forEach((p) => {
      if (p.status === "concluido" || !p.data_prevista) return;
      const d = new Date(p.data_prevista);
      d.setHours(0, 0, 0, 0);
      const dias = Math.round((d.getTime() - hoje.getTime()) / 86400000);
      if (dias < 3) {
        alertas.push({ cliente: p.cliente_nome || p.id.slice(0, 8), dias, tipo: "interna" });
      }
    });

    alertas.sort((a, b) => a.dias - b.dias);

    return { totalEmProducao, totalAtrasados, tempoMedio, taxaConclusao, alertas };
  }, [terceirizados, internas]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Em Produção" value={metrics.totalEmProducao} color="#1E6FBF" icon={Activity} />
        <KpiCard label="Atrasados" value={metrics.totalAtrasados} color="#E53935" icon={AlertTriangle} />
        <KpiCard label="Tempo Médio (dias)" value={metrics.tempoMedio} color="#E8A020" icon={Clock} />
        <KpiCard label="Taxa Conclusão (30d)" value={`${metrics.taxaConclusao}%`} color="#12B76A" icon={CheckCircle2} />
      </div>

      {metrics.alertas.length > 0 && (
        <div className="rounded-xl bg-white p-5" style={{ border: "0.5px solid #E8ECF2" }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} style={{ color: "#E53935" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#0D1117" }}>Alertas de Prazo</span>
            <span className="rounded-full px-2 py-0.5" style={{ fontSize: 11, backgroundColor: "#FEE4E2", color: "#E53935" }}>
              {metrics.alertas.length}
            </span>
          </div>
          <div className="space-y-2 max-h-[280px] overflow-y-auto">
            {metrics.alertas.map((a, i) => (
              <AlertaItem key={i} cliente={a.cliente} dias={a.dias} tipo={a.tipo} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
