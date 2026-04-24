import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import {
  Folder,
  TrendingUp,
  Percent,
  Users,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

const ETAPAS_CONFIG: { key: string; label: string; bg: string; text: string }[] = [
  { key: "comercial", label: "Comercial", bg: "#E6F1FB", text: "#0C447C" },
  { key: "tecnico", label: "Revisão Técnica", bg: "#EEEDFE", text: "#3C3489" },
  { key: "producao", label: "Produção", bg: "#FAEEDA", text: "#633806" },
  { key: "logistica", label: "Logística", bg: "#EAF3DE", text: "#27500A" },
  { key: "montagem", label: "Montagem", bg: "#E1F5EE", text: "#085041" },
  { key: "pos_venda", label: "Pós-Venda", bg: "#FBEAF0", text: "#72243E" },
  { key: "finalizado", label: "Finalizado", bg: "#F1EFE8", text: "#444441" },
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
    <div
      className="relative bg-white p-5"
      style={{ ...cardStyle, borderTop: `3px solid ${color}` }}
    >
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
  const navigate = useNavigate();

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
            .not("status", "in", "(cancelado,finalizado)"),
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
          supabase
            .from("contratos")
            .select("id, status, valor_venda")
            .not("status", "eq", "cancelado"),
        ]);

      const faturamento =
        faturamentoMes.data?.reduce((s, c) => s + Number(c.valor_venda || 0), 0) ?? 0;
      const margens =
        dre.data?.map((d) => Number(d.margem_realizada || 0)).filter((n) => !isNaN(n)) ?? [];
      const margemMedia =
        margens.length > 0 ? margens.reduce((a, b) => a + b, 0) / margens.length : null;

      const pipeline: Record<string, { count: number; total: number; noPrazo: number; emAlerta: number; emAtraso: number }> = {};
      ETAPAS_CONFIG.forEach((e) => {
        pipeline[e.key] = { count: 0, total: 0, noPrazo: 0, emAlerta: 0, emAtraso: 0 };
      });

      contratosByStatus.data?.forEach((c: any) => {
        const etapa = c.status || "comercial";
        if (pipeline[etapa]) {
          pipeline[etapa].count += 1;
          pipeline[etapa].total += Number(c.valor_venda || 0);
          
          // Fallback para status de prazo já que a coluna não existe em contratos
          pipeline[etapa].noPrazo += 1;
        }
      });

      return {
        contratosAtivos: contratosAtivos.count ?? 0,
        faturamento,
        margemMedia,
        leadsAtivos: leadsAtivos.count ?? 0,
        pipeline,
      };
    },
  });

  const formatBRL = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

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

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Pipeline de contratos */}
      <div className="bg-white p-6" style={cardStyle}>
        <div className="mb-6 flex items-center justify-between">
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "#0D1117" }}> Pipeline de contratos </h2>
          <span style={{ fontSize: 14, color: "#6B7A90" }}>
            {stats?.contratosAtivos ?? 0} contratos em andamento
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {ETAPAS_CONFIG.map((etapa) => {
            const data = stats?.pipeline?.[etapa.key] || { count: 0, total: 0, noPrazo: 0, emAlerta: 0, emAtraso: 0 };
            return (
              <button
                key={etapa.key}
                onClick={() => navigate(`/comercial?etapa=${etapa.key}`)}
                className="flex flex-col rounded-xl p-4 text-left transition-all hover:brightness-95 active:scale-[0.98]"
                style={{ backgroundColor: etapa.bg }}
              >
                <span className="mb-1 block truncate font-semibold" style={{ color: etapa.text, fontSize: 14 }}>
                  {etapa.label}
                </span>
                <span className="mb-1 block font-bold" style={{ color: etapa.text, fontSize: 18 }}>
                  {data.count} {data.count === 1 ? 'contrato' : 'contratos'}
                </span>
                <span className="mb-3 block font-medium opacity-80" style={{ color: etapa.text, fontSize: 13 }}>
                  {formatBRL(data.total)}
                </span>
                
                <div className="mt-auto flex gap-1.5">
                  <div className="flex h-5 w-7 items-center justify-center rounded bg-green-500/10 text-[10px] font-bold text-green-700" title="No prazo">
                    🟢 {data.noPrazo}
                  </div>
                  <div className="flex h-5 w-7 items-center justify-center rounded bg-amber-500/10 text-[10px] font-bold text-amber-700" title="Em alerta">
                    🟡 {data.emAlerta}
                  </div>
                  <div className="flex h-5 w-7 items-center justify-center rounded bg-red-500/10 text-[10px] font-bold text-red-700" title="Em atraso">
                    🔴 {data.emAtraso}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between border-t pt-4">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[11px] text-[#6B7A90]">
              <span className="h-2 w-2 rounded-full bg-green-500" /> no prazo
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#6B7A90]">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> em alerta
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#6B7A90]">
              <span className="h-2 w-2 rounded-full bg-red-500" /> em atraso
            </span>
          </div>
          <span className="text-[11px] text-[#6B7A90]">
            Clique em uma etapa para ver os contratos
          </span>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Ponto de equilíbrio */}
        <div className="flex flex-col bg-white p-5" style={cardStyle}>
          <h2
            className="mb-4"
            style={{ fontSize: 15, fontWeight: 500, color: "#0D1117" }}
          >
            Ponto de equilíbrio
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 13, color: "#6B7A90" }}>Custo fixo mensal</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#0D1117" }}>
                {formatBRL(custoFixo)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 13, color: "#6B7A90" }}>PE calculado</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#0D1117" }}>
                {formatBRL(pe)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 13, color: "#6B7A90" }}>Faturamento atual</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#0D1117" }}>
                {formatBRL(faturamentoAtual)}
              </span>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between">
              <span style={{ fontSize: 12, color: "#6B7A90" }}>% do PE atingido</span>
              <span style={{ fontSize: 12, color: "#6B7A90" }}>
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
                  background: "#1E6FBF",
                  borderRadius: 999,
                }}
              />
            </div>
          </div>

          <Link
            to="/financeiro"
            className="mt-5 inline-flex items-center gap-1 self-start text-[#1E6FBF] transition-colors hover:text-[#00AAFF]"
            style={{ fontSize: 13, fontWeight: 500 }}
          >
            Configurar custos fixos
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}