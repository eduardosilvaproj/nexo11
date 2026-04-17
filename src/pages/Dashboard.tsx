import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  Folder,
  TrendingUp,
  Percent,
  Users,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

const ETAPAS: { key: string; label: string; color: string }[] = [
  { key: "comercial", label: "Comercial", color: "#1E6FBF" },
  { key: "tecnico", label: "Técnico", color: "#7C3AED" },
  { key: "producao", label: "Produção", color: "#F97316" },
  { key: "logistica", label: "Logística", color: "#12B76A" },
  { key: "montagem", label: "Montagem", color: "#0EA5A4" },
  { key: "pos_venda", label: "Pós-venda", color: "#E8A020" },
  { key: "finalizado", label: "Finalizado", color: "#05873C" },
];

interface MetricCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
  valueColor?: string;
}

const cardStyle: React.CSSProperties = {
  border: "0.5px solid #E8ECF2",
  borderRadius: "12px",
};

function MetricCard({ label, value, icon: Icon, color, valueColor = "#0D1117" }: MetricCardProps) {
  return (
    <div className="relative bg-white p-5" style={cardStyle}>
      <Icon
        className="absolute right-4 top-4"
        style={{ color, width: 20, height: 20 }}
      />
      <p style={{ fontSize: 12, color: "#6B7A90" }}>{label}</p>
      <p
        className="mt-2"
        style={{ fontSize: 24, fontWeight: 500, color: valueColor, lineHeight: 1.2 }}
      >
        {value}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const { perfil, user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const [contratosAtivos, faturamentoMes, dre, leadsAtivos, contratosByStatus] =
        await Promise.all([
          supabase
            .from("contratos")
            .select("id", { count: "exact", head: true })
            .not("status", "in", "(finalizado)"),
          supabase
            .from("contratos")
            .select("valor_venda")
            .eq("status", "finalizado")
            .gte("data_finalizacao", inicioMes.toISOString()),
          supabase.from("dre_contrato").select("margem_realizada"),
          supabase
            .from("leads")
            .select("id", { count: "exact", head: true })
            .not("status", "in", "(convertido,perdido)"),
          supabase.from("contratos").select("status"),
        ]);

      const faturamento =
        faturamentoMes.data?.reduce((s, c) => s + Number(c.valor_venda || 0), 0) ?? 0;
      const margens =
        dre.data?.map((d) => Number(d.margem_realizada || 0)).filter((n) => !isNaN(n)) ?? [];
      const margemMedia =
        margens.length > 0 ? margens.reduce((a, b) => a + b, 0) / margens.length : null;

      const porEtapa: Record<string, number> = {};
      ETAPAS.forEach((e) => (porEtapa[e.key] = 0));
      contratosByStatus.data?.forEach((c) => {
        if (porEtapa[c.status] != null) porEtapa[c.status] += 1;
      });

      return {
        contratosAtivos: contratosAtivos.count ?? 0,
        faturamento,
        margemMedia,
        leadsAtivos: leadsAtivos.count ?? 0,
        porEtapa,
      };
    },
  });

  const formatBRL = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  // Ponto de equilíbrio (placeholder até existir tabela de custos fixos)
  const custoFixo = 0;
  const margemMediaPct = stats?.margemMedia ?? 0;
  const pe = margemMediaPct > 0 ? (custoFixo / margemMediaPct) * 100 : 0;
  const faturamentoAtual = stats?.faturamento ?? 0;
  const peProgress = pe > 0 ? Math.min(100, (faturamentoAtual / pe) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: "#0D1117", letterSpacing: "-0.01em" }}>
          Olá, {perfil?.nome ?? "Bem-vindo"}
        </h1>
        <p className="mt-1" style={{ fontSize: 14, color: "#6B7A90" }}>
          {perfil?.loja_id
            ? "Visão geral da sua loja."
            : "Você ainda não está vinculado a uma loja. Peça ao admin para te associar."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Contratos ativos"
          value={String(stats?.contratosAtivos ?? 0)}
          icon={Folder}
          color="#1E6FBF"
        />
        <MetricCard
          label="Faturamento do mês"
          value={formatBRL(stats?.faturamento ?? 0)}
          icon={TrendingUp}
          color="#1E6FBF"
        />
        <MetricCard
          label="Margem média"
          value={stats?.margemMedia != null ? `${stats.margemMedia.toFixed(1)}%` : "—"}
          icon={Percent}
          color="#12B76A"
          valueColor={stats?.margemMedia != null ? "#0D1117" : "#B0BAC9"}
        />
        <MetricCard
          label="Leads ativos"
          value={String(stats?.leadsAtivos ?? 0)}
          icon={Users}
          color="#E8A020"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Contratos por etapa */}
        <div className="bg-white p-5" style={cardStyle}>
          <h2
            className="mb-4"
            style={{ fontSize: 14, fontWeight: 600, color: "#0D1117" }}
          >
            Contratos por etapa
          </h2>
          <ul className="space-y-2">
            {ETAPAS.map((e) => {
              const count = stats?.porEtapa?.[e.key] ?? 0;
              return (
                <li
                  key={e.key}
                  className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-[#F5F7FA]"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-block rounded-full"
                      style={{ width: 8, height: 8, background: e.color }}
                    />
                    <span style={{ fontSize: 13, color: "#0D1117" }}>{e.label}</span>
                  </div>
                  <span
                    className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#3D4A5C",
                      background: "#E8ECF2",
                      minWidth: 28,
                    }}
                  >
                    {count}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Ponto de equilíbrio */}
        <div className="flex flex-col bg-white p-5" style={cardStyle}>
          <h2
            className="mb-4"
            style={{ fontSize: 14, fontWeight: 600, color: "#0D1117" }}
          >
            Ponto de equilíbrio
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 12, color: "#6B7A90" }}>Custo fixo mensal</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#0D1117" }}>
                {formatBRL(custoFixo)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 12, color: "#6B7A90" }}>PE calculado</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#0D1117" }}>
                {formatBRL(pe)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 12, color: "#6B7A90" }}>Faturamento atual</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#0D1117" }}>
                {formatBRL(faturamentoAtual)}
              </span>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between">
              <span style={{ fontSize: 11, color: "#6B7A90" }}>% do PE atingido</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#0D1117" }}>
                {peProgress.toFixed(0)}%
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden"
              style={{ background: "#E8ECF2", borderRadius: 999 }}
            >
              <div
                className="h-full transition-all"
                style={{
                  width: `${peProgress}%`,
                  background:
                    peProgress >= 100
                      ? "#12B76A"
                      : peProgress >= 50
                      ? "#1E6FBF"
                      : "#E8A020",
                  borderRadius: 999,
                }}
              />
            </div>
          </div>

          <Link
            to="/financeiro"
            className="mt-5 inline-flex items-center gap-1 self-start"
            style={{ fontSize: 13, fontWeight: 500, color: "#1E6FBF" }}
          >
            Configurar custos fixos
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
