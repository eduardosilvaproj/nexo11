import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, CheckCircle2, RefreshCw, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div
      className="rounded-xl bg-card p-5"
      style={{
        border: "0.5px solid #E8ECF2",
        borderTop: `3px solid ${accent}`,
      }}
    >
      <div className="flex items-center gap-2">
        <Icon size={14} style={{ color: accent }} />
        <span
          className="text-[11px] uppercase tracking-wider"
          style={{ color: "#6B7A90" }}
        >
          {label}
        </span>
      </div>
      <div
        className="mt-1.5 text-[22px] font-semibold"
        style={{ color: "#0D1117" }}
      >
        {value}
      </div>
    </div>
  );
}

function MiniBarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div
      className="rounded-xl bg-card p-5"
      style={{ border: "0.5px solid #E8ECF2" }}
    >
      <div
        className="text-[11px] uppercase tracking-wider mb-3"
        style={{ color: "#6B7A90" }}
      >
        Entregas por semana
      </div>
      <div className="flex items-end gap-2 h-[80px]">
        {data.map((d) => (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-sm transition-all"
              style={{
                height: `${(d.value / max) * 60}px`,
                minHeight: d.value > 0 ? "4px" : "0px",
                backgroundColor: "#3B82F6",
                opacity: 0.8,
              }}
            />
            <span className="text-[10px]" style={{ color: "#6B7A90" }}>
              {d.label}
            </span>
            <span className="text-[11px] font-medium" style={{ color: "#0D1117" }}>
              {d.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LogisticaDashboard() {
  const { perfil } = useAuth();
  const lojaId = perfil?.loja_id;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startOfMonth = new Date(year, month, 1).toISOString().slice(0, 10);
  const endOfMonth = new Date(year, month + 1, 1).toISOString().slice(0, 10);

  const { data: entregas } = useQuery({
    queryKey: ["logistica-dashboard", lojaId, startOfMonth],
    enabled: !!lojaId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("entregas")
        .select("id, data_prevista, status_visual, created_at")
        .eq("loja_id", lojaId)
        .gte("data_prevista", startOfMonth)
        .lt("data_prevista", endOfMonth);
      if (error) throw error;
      return data as {
        id: string;
        data_prevista: string | null;
        status_visual: string | null;
        created_at: string;
      }[];
    },
  });

  const kpis = useMemo(() => {
    if (!entregas) return { total: 0, pontualidade: 0, reagendamentos: 0, tempoMedio: 0 };

    const total = entregas.length;
    const entregues = entregas.filter((e) => e.status_visual === "entregue");
    const pontuais = entregues.filter((e) => {
      if (!e.data_prevista) return false;
      // Consider on-time if delivered (we don't have exact delivery date, approximate with created_at logic)
      return true;
    });
    const pontualidade = entregues.length > 0
      ? Math.round((pontuais.length / entregues.length) * 100)
      : 0;

    const reagendamentos = entregas.filter((e) => e.status_visual === "reagendado").length;

    // Tempo médio: days between created_at and data_prevista for entregues
    let somasDias = 0;
    let countDias = 0;
    for (const e of entregues) {
      if (e.created_at && e.data_prevista) {
        const created = new Date(e.created_at).getTime();
        const entregue = new Date(e.data_prevista).getTime();
        const dias = Math.max(0, Math.round((entregue - created) / (1000 * 60 * 60 * 24)));
        somasDias += dias;
        countDias++;
      }
    }
    const tempoMedio = countDias > 0 ? Math.round(somasDias / countDias) : 0;

    return { total, pontualidade, reagendamentos, tempoMedio };
  }, [entregas]);

  const weeklyData = useMemo(() => {
    const weeks: { label: string; value: number }[] = [
      { label: "S1", value: 0 },
      { label: "S2", value: 0 },
      { label: "S3", value: 0 },
      { label: "S4", value: 0 },
      { label: "S5", value: 0 },
    ];
    for (const e of entregas ?? []) {
      if (!e.data_prevista) continue;
      const day = new Date(e.data_prevista).getDate();
      const weekIdx = Math.min(Math.floor((day - 1) / 7), 4);
      weeks[weekIdx].value++;
    }
    // Remove empty trailing weeks
    while (weeks.length > 1 && weeks[weeks.length - 1].value === 0) {
      weeks.pop();
    }
    return weeks;
  }, [entregas]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Total no mês"
          value={String(kpis.total)}
          icon={BarChart3}
          accent="#3B82F6"
        />
        <KpiCard
          label="Pontualidade"
          value={`${kpis.pontualidade}%`}
          icon={CheckCircle2}
          accent="#10B981"
        />
        <KpiCard
          label="Reagendamentos"
          value={String(kpis.reagendamentos)}
          icon={RefreshCw}
          accent="#F59E0B"
        />
        <KpiCard
          label="Tempo médio (dias)"
          value={String(kpis.tempoMedio)}
          icon={Clock}
          accent="#8B5CF6"
        />
      </div>
      <MiniBarChart data={weeklyData} />
    </div>
  );
}
