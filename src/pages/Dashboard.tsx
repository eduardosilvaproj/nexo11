import { useEffect } from "react";
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
import { cn } from "@/lib/utils";
import { QuickShortcuts } from "@/components/dashboard/QuickShortcuts";

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
  border: "1px solid rgba(226, 232, 240, 0.9)",
  borderRadius: "18px",
};

function MetricCard({ label, value, icon: Icon, color, valueColor = "#0D1117" }: MetricCardProps) {
  return (
    <div
      className="group relative overflow-hidden bg-white/95 p-5 shadow-sm shadow-slate-200/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-200/80"
      style={{ ...cardStyle, borderTop: `4px solid ${color}` }}
    >
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-slate-50 transition-transform group-hover:scale-125" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight" style={{ color: valueColor, lineHeight: 1.15 }}>
            {value}
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ color, backgroundColor: `${color}14` }}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
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

      const [faturamentoMes, dre, leadsAtivos, contratosData, mensagensNaoLidas] =
        await Promise.all([
          supabase
            .from("contratos")
            .select("valor_venda")
            .gte("created_at", inicioMes.toISOString()),
          supabase.from("dre_contrato").select("margem_realizada"),
          supabase
            .from("leads")
            .select("id", { count: "exact", head: true })
            .not("status", "in", "(convertido,perdido)"),
          supabase
            .from("contratos")
            .select("id, status, valor_venda")
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

      let totalAtivos = 0;
      contratosData.data?.forEach((c: any) => {
        const etapa = c.status;
        if (pipeline[etapa]) {
          pipeline[etapa].count += 1;
          pipeline[etapa].total += Number(c.valor_venda || 0);
          pipeline[etapa].noPrazo += 1;
          
          if (etapa !== 'finalizado' && etapa !== 'cancelado') {
            totalAtivos += 1;
          }
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
        contratosAtivos: totalAtivos,
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
    <div className="space-y-7">
      <QuickShortcuts />
      <div className="relative overflow-hidden rounded-[28px] border border-sky-100 bg-gradient-to-br from-white via-sky-50/70 to-emerald-50/60 p-6 shadow-sm shadow-slate-200/70">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute bottom-0 right-28 h-32 w-32 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full border border-sky-200 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-sky-700">
              Painel NEXUS
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-slate-950">
              Olá, {perfil?.nome ?? "Bem-vindo"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {perfil?.loja_id
                ? "Visão executiva da sua loja, com contratos, vendas, margem e mensagens em um só lugar."
                : "Você ainda não está vinculado a uma loja. Peça ao admin para te associar."}
            </p>
          </div>
          <div className="hidden md:flex shrink-0 items-center justify-center">
            <LogoNexo 
              size="2xl"
              className="h-16 xs:h-20 sm:h-28 md:h-36 lg:h-44 xl:h-52 w-auto max-w-full transition-all hover:scale-[1.02]" 
            />
          </div>
        </div>
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
      <div className="bg-white/95 p-6 shadow-sm shadow-slate-200/70" style={cardStyle}>
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-[-0.02em] text-slate-950">Pipeline de contratos</h2>
            <p className="mt-1 text-sm text-slate-500">Acompanhe volume, valor e saúde de cada etapa.</p>
          </div>
          <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">
            {stats?.contratosAtivos ?? 0} em andamento
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {ETAPAS_CONFIG.map((etapa) => {
            const data = stats?.pipeline?.[etapa.key] || { count: 0, total: 0, noPrazo: 0, emAlerta: 0, emAtraso: 0 };
            return (
              <button
                key={etapa.key}
                onClick={() => navigate(`/comercial?etapa=${etapa.key}`)}
                className="group flex min-h-40 flex-col rounded-2xl border bg-slate-50/80 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-slate-200/70 active:translate-y-0"
                style={{ borderColor: `${etapa.border}30`, borderTop: `4px solid ${etapa.border}` }}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <span className="text-3xl font-bold leading-none text-slate-950">{data.count}</span>
                  <span className="rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em]" style={{ backgroundColor: etapa.iconBg, color: etapa.text }}>
                    {etapa.key === "finalizado" ? "fim" : "etapa"}
                  </span>
                </div>
                <span className="block truncate text-sm font-bold text-slate-700">{etapa.label}</span>
                <span className="mt-1 block text-sm font-semibold text-slate-500">{formatBRL(data.total)}</span>

                <div className="mt-auto grid grid-cols-3 gap-1.5 pt-4">
                  {[
                    { label: "Prazo", value: data.noPrazo, className: "bg-emerald-50 text-emerald-700" },
                    { label: "Alerta", value: data.emAlerta, className: "bg-amber-50 text-amber-700" },
                    { label: "Atraso", value: data.emAtraso, className: "bg-rose-50 text-rose-700" },
                  ].map((item) => (
                    <div key={item.label} className={cn("rounded-lg px-1.5 py-1 text-center", item.className)} title={item.label}>
                      <div className="text-xs font-bold leading-none">{item.value}</div>
                      <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide opacity-70">{item.label}</div>
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> no prazo
            </span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> em alerta
            </span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> em atraso
            </span>
          </div>
          <span className="text-xs font-medium text-slate-500">
            Clique em uma etapa para ver os contratos
          </span>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 items-stretch">
        {/* Ponto de equilíbrio */}
        <div className="flex h-full flex-col bg-white/95 p-6 shadow-sm shadow-slate-200/70" style={cardStyle}>
          <div className="mb-5">
            <h2 className="text-lg font-bold tracking-[-0.02em] text-slate-950">Ponto de equilíbrio</h2>
            <p className="mt-1 text-sm text-slate-500">Indicadores para calibrar custos e metas mensais.</p>
          </div>

          <div className="space-y-3">
            {[
              ["Custo fixo mensal", formatBRL(custoFixo)],
              ["PE calculado", formatBRL(pe)],
              ["Faturamento atual", formatBRL(faturamentoAtual)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-500">{label}</span>
                <span className="text-sm font-bold text-slate-950">{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">% do PE atingido</span>
              <span className="text-sm font-bold text-sky-700">
                {peProgress.toFixed(0)}%
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all"
                style={{ width: `${peProgress}%` }}
              />
            </div>
          </div>

          <Link
            to="/financeiro"
            className="mt-auto inline-flex items-center gap-1 self-start pt-6 text-sm font-semibold text-sky-700 transition-colors hover:text-emerald-600"
          >
            Configurar custos fixos
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Mensagens por etapa */}
        <div className="flex h-full flex-col bg-white/95 p-6 shadow-sm shadow-slate-200/70" style={cardStyle}>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold tracking-[-0.02em] text-slate-950">Mensagens por etapa</h2>
              <p className="mt-1 text-sm text-slate-500">Conversas abertas e pendências de leitura.</p>
            </div>
            {(stats?.totalUnread ?? 0) > 0 && (
              <span className="flex h-7 shrink-0 items-center justify-center rounded-full bg-rose-500 px-3 text-xs font-bold text-white shadow-sm shadow-rose-200">
                {stats?.totalUnread} não lidas
              </span>
            )}
          </div>

          <div className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">
            {ETAPAS_CONFIG.filter(e => e.key !== 'finalizado').map((etapa) => {
              const data = stats?.mensagens?.[etapa.key] || { totalConversas: 0, unreadCount: 0 };
              return (
                <button
                  key={etapa.key}
                  onClick={() => {
                    localStorage.setItem('mensagens_filtro_etapa', etapa.key);
                    navigate('/mensagens');
                  }}
                  className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3 transition-all hover:-translate-y-0.5 hover:border-sky-100 hover:bg-white hover:shadow-md hover:shadow-slate-200/70"
                >
                  <div 
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm" 
                    style={{ backgroundColor: etapa.iconBg, color: etapa.border }}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="truncate text-sm font-bold text-slate-700">{etapa.label}</span>
                    <span className="text-xs font-medium text-slate-500">{data.totalConversas} {data.totalConversas === 1 ? 'conversa' : 'conv.'}</span>
                  </div>
                  {data.unreadCount > 0 && (
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white shadow-sm shadow-rose-200">
                      {data.unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          
          <Link
            to="/mensagens"
            className="mt-4 inline-flex items-center gap-1 self-start text-sm font-semibold text-sky-700 hover:text-emerald-600"
          >
            Ver todas as mensagens
          </Link>
        </div>
      </div>
    </div>
  );
}