import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import {
  Folder,
  TrendingUp,
  Percent,
  Users,
  ArrowRight,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

const ETAPAS_CONFIG: { key: string; label: string; border: string; text: string; iconBg: string }[] = [
  { key: "comercial", label: "Comercial", border: "#378ADD", text: "#0C447C", iconBg: "#E6F1FB" },
  { key: "tecnico", label: "Revisão Técnica", border: "#7F77DD", text: "#3C3489", iconBg: "#EEEDFE" },
  { key: "producao", label: "Produção", border: "#EF9F27", text: "#633806", iconBg: "#FAEEDA" },
  { key: "logistica", label: "Logística", border: "#1D9E75", text: "#27500A", iconBg: "#EAF3DE" },
  { key: "montagem", label: "Montagem", border: "#5DCAA5", text: "#085041", iconBg: "#E1F5EE" },
  { key: "pos_venda", label: "Pós-Venda", border: "#D4537E", text: "#72243E", iconBg: "#FBEAF0" },
  { key: "finalizado", label: "Finalizado", border: "#888780", text: "#444441", iconBg: "#F1EFE8" },
];

interface MetricCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
  valueColor?: string;
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #E8ECF2",
  borderRadius: "12px",
};

function MetricCard({ label, value, icon: Icon, color, valueColor = "#0D1117" }: MetricCardProps) {
  return (
    <div
      className="relative bg-white p-5 shadow-sm"
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

  const queryClient = useQueryClient();
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const [contratosAtivos, faturamentoMes, dre, leadsAtivos, contratosByStatus, mensagensNaoLidas] =
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
            .not("status", "is", null)
            .not("status", "is", null),
          supabase
            .from("chat_mensagens")
            .select("id, contrato_id, lida, contratos(status)")
            .eq("lida", false)
            .eq("remetente_tipo", "cliente"),
        ]);

      const faturamento =
        faturamentoMes.data?.reduce((s, c) => s + Number(c.valor_venda || 0), 0) ?? 0;
      const margens =
        dre.data?.map((d) => Number(d.margem_realizada || 0)).filter((n) => !isNaN(n)) ?? [];
      const margemMedia =
        margens.length > 0 ? margens.reduce((a, b) => a + b, 0) / margens.length : null;

      const pipeline: Record<string, { count: number; total: number; noPrazo: number; emAlerta: number; emAtraso: number }> = {};
      const mensagens: Record<string, { totalConversas: number; unreadCount: number }> = {};
      
      ETAPAS_CONFIG.forEach((e) => {
        pipeline[e.key] = { count: 0, total: 0, noPrazo: 0, emAlerta: 0, emAtraso: 0 };
        mensagens[e.key] = { totalConversas: 0, unreadCount: 0 };
      });

      const contratosMap: Record<string, string> = {};
      contratosByStatus.data?.forEach((c: any) => {
        const etapa = c.status;
        contratosMap[c.id] = etapa;
        if (pipeline[etapa]) {
          pipeline[etapa].count += 1;
          pipeline[etapa].total += Number(c.valor_venda || 0);
          pipeline[etapa].noPrazo += 1; // Fallback
        }
        if (mensagens[etapa]) {
          mensagens[etapa].totalConversas += 1;
        }
      });

      let totalUnread = 0;
      mensagensNaoLidas.data?.forEach((m: any) => {
        const etapa = m.contratos?.status;
        if (etapa && mensagens[etapa]) {
          mensagens[etapa].unreadCount += 1;
          totalUnread += 1;
        }
      });

      return {
        contratosAtivos: contratosAtivos.count ?? 0,
        faturamento,
        margemMedia,
        leadsAtivos: leadsAtivos.count ?? 0,
        pipeline,
        mensagens,
        totalUnread,
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

  // Realtime updates for messages
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_mensagens" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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
      <div className="bg-white p-6 shadow-sm" style={cardStyle}>
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
                className="flex flex-col rounded-xl border-l-[4px] bg-[#F8F9FA] p-4 text-left transition-all hover:bg-[#F1F3F5] active:scale-[0.98]"
                style={{ borderLeftColor: etapa.border }}
              >
                <span className="mb-0.5 block font-bold text-[#212529]" style={{ fontSize: 24, lineHeight: 1.1 }}>
                  {data.count}
                </span>
                <span className="mb-2 block truncate font-semibold text-[#6B7A90]" style={{ fontSize: 13 }}>
                  {etapa.label}
                </span>
                <span className="mb-3 block font-semibold text-[#495057]" style={{ fontSize: 13 }}>
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

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 items-stretch">
        {/* Ponto de equilíbrio */}
        <div className="flex flex-col bg-white p-6 shadow-sm h-full" style={cardStyle}>
          <h2
            className="mb-4"
            style={{ fontSize: 16, fontWeight: 600, color: "#0D1117" }}
          >
            Ponto de equilíbrio
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 14, color: "#6B7A90" }}>Custo fixo mensal</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#0D1117" }}>
                {formatBRL(custoFixo)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 14, color: "#6B7A90" }}>PE calculado</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#0D1117" }}>
                {formatBRL(pe)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 14, color: "#6B7A90" }}>Faturamento atual</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#0D1117" }}>
                {formatBRL(faturamentoAtual)}
              </span>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <span style={{ fontSize: 12, color: "#6B7A90" }}>% do PE atingido</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#1E6FBF" }}>
                {peProgress.toFixed(0)}%
              </span>
            </div>
            <div
              className="h-2.5 w-full overflow-hidden"
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
            className="mt-auto pt-6 inline-flex items-center gap-1 self-start text-[#1E6FBF] transition-colors hover:text-[#00AAFF]"
            style={{ fontSize: 13, fontWeight: 500 }}
          >
            Configurar custos fixos
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Mensagens por etapa */}
        <div className="flex flex-col bg-white p-6 shadow-sm h-full" style={cardStyle}>
          <div className="mb-4 flex items-center justify-between">
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0D1117" }}>Mensagens por etapa</h2>
            {(stats?.totalUnread ?? 0) > 0 && (
              <span className="flex h-6 items-center justify-center rounded-full bg-red-500 px-2.5 text-[11px] font-bold text-white">
                {stats?.totalUnread} não lidas
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 flex-1 overflow-y-auto">
            {ETAPAS_CONFIG.filter(e => e.key !== 'finalizado').map((etapa) => {
              const data = stats?.mensagens?.[etapa.key] || { totalConversas: 0, unreadCount: 0 };
              return (
                <button
                  key={etapa.key}
                  onClick={() => {
                    localStorage.setItem('mensagens_filtro_etapa', etapa.key);
                    navigate('/mensagens');
                  }}
                  className="group flex items-center gap-3 rounded-lg border border-transparent bg-[#F8F9FA] p-3 transition-all hover:border-[#E2E8F0] hover:bg-white"
                >
                  <div 
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm" 
                    style={{ backgroundColor: etapa.iconBg, color: etapa.border }}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="truncate text-[13px] font-semibold text-gray-700">{etapa.label}</span>
                    <span className="text-[11px] text-gray-500">{data.totalConversas} {data.totalConversas === 1 ? 'conversa' : 'conv.'}</span>
                  </div>
                  {data.unreadCount > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {data.unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          
          <Link
            to="/mensagens"
            className="mt-4 text-[11px] text-[#6B7A90] hover:text-[#1E6FBF]"
          >
            Ver todas as mensagens
          </Link>
        </div>
      </div>
    </div>
  );
}