import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Folder, TrendingUp, Percent, Users } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties; size?: number }>;
  color: string;
}

function MetricCard({ label, value, icon: Icon, color }: MetricCardProps) {
  return (
    <div
      className="relative bg-white p-5"
      style={{
        border: "0.5px solid #E8ECF2",
        borderRadius: "12px",
      }}
    >
      <Icon
        className="absolute right-4 top-4"
        style={{ color, width: 20, height: 20 }}
      />
      <p style={{ fontSize: 12, color: "#6B7A90" }}>{label}</p>
      <p
        className="mt-2"
        style={{ fontSize: 24, fontWeight: 500, color: "#0D1117", lineHeight: 1.2 }}
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

      const [contratosAtivos, faturamentoMes, dre, leadsAtivos] = await Promise.all([
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
      ]);

      const faturamento =
        faturamentoMes.data?.reduce((s, c) => s + Number(c.valor_venda || 0), 0) ?? 0;
      const margens =
        dre.data?.map((d) => Number(d.margem_realizada || 0)).filter((n) => !isNaN(n)) ?? [];
      const margemMedia =
        margens.length > 0 ? margens.reduce((a, b) => a + b, 0) / margens.length : null;

      return {
        contratosAtivos: contratosAtivos.count ?? 0,
        faturamento,
        margemMedia,
        leadsAtivos: leadsAtivos.count ?? 0,
      };
    },
  });

  const formatBRL = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Olá, {perfil?.nome ?? "Bem-vindo"} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
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
        />
        <MetricCard
          label="Leads ativos"
          value={String(stats?.leadsAtivos ?? 0)}
          icon={Users}
          color="#E8A020"
        />
      </div>
    </div>
  );
}
