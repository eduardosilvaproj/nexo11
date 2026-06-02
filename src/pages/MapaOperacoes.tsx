import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Truck,
  Wrench,
  Ruler,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Activity,
  MapPin,
  Circle,
} from "lucide-react";

/* ─── Types ─── */
interface OperationDot {
  id: string;
  type: "entrega" | "montagem" | "medicao" | "chamado";
  label: string;
  cliente: string;
  endereco?: string;
  x: number;
  y: number;
  time: string;
}

interface FeedItem {
  id: string;
  type: "entrega" | "montagem" | "medicao" | "chamado";
  action: string;
  cliente: string;
  time: string;
  endereco?: string;
}

type FilterPeriod = "hoje" | "semana" | "mes";

/* ─── Constants ─── */
const TYPE_CONFIG = {
  entrega: { color: "#3B82F6", label: "Entregas agendadas", icon: Truck },
  montagem: { color: "#10B981", label: "Montagens em execução", icon: Wrench },
  medicao: { color: "#F59E0B", label: "Medições agendadas", icon: Ruler },
  chamado: { color: "#EF4444", label: "Chamados abertos", icon: AlertTriangle },
} as const;

/* ─── Utility: pseudo-random position seeded by string ─── */
function seededPosition(seed: string, index: number): { x: number; y: number } {
  let hash = 0;
  const str = seed + index.toString();
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const clusterX = ((Math.abs(hash) % 7) / 7) * 60 + 15;
  const clusterY = ((Math.abs(hash >> 8) % 7) / 7) * 60 + 15;
  const offsetX = ((Math.abs(hash >> 16) % 20) - 10) * 0.5;
  const offsetY = ((Math.abs(hash >> 24) % 20) - 10) * 0.5;
  return {
    x: Math.min(90, Math.max(5, clusterX + offsetX)),
    y: Math.min(85, Math.max(5, clusterY + offsetY)),
  };
}

function getFilterDate(period: FilterPeriod): string {
  const d = new Date();
  if (period === "hoje") {
    d.setHours(0, 0, 0, 0);
  } else if (period === "semana") {
    d.setDate(d.getDate() - 7);
  } else {
    d.setDate(1);
  }
  return d.toISOString();
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/* ─── Inline keyframes via style tag ─── */
const animationStyles = `
@keyframes mapa-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.8); opacity: 0; }
}
@keyframes mapa-glow {
  0%, 100% { box-shadow: 0 0 4px currentColor; }
  50% { box-shadow: 0 0 16px currentColor, 0 0 32px currentColor; }
}
@keyframes mapa-feed-in {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes mapa-grid-move {
  0% { background-position: 0 0; }
  100% { background-position: 40px 40px; }
}
@keyframes mapa-counter-pop {
  0% { transform: scale(0.8); opacity: 0; }
  60% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}
`;

/* ─── Component ─── */
export default function MapaOperacoes() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<FilterPeriod>("hoje");
  const [hoveredDot, setHoveredDot] = useState<string | null>(null);

  const filterDate = useMemo(() => getFilterDate(period), [period]);

  /* ─── Queries ─── */
  const { data: entregas = [] } = useQuery({
    queryKey: ["mapa-entregas", filterDate],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("entregas")
        .select("id, data_entrega, status, created_at, contrato_id, contratos(cliente_nome, endereco_entrega)")
        .gte("created_at", filterDate)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const { data: montagens = [] } = useQuery({
    queryKey: ["mapa-montagens", filterDate],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("agendamentos_montagem")
        .select("id, data_inicio, status, created_at, contrato_id, contratos(cliente_nome)")
        .gte("created_at", filterDate)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const { data: chamados = [] } = useQuery({
    queryKey: ["mapa-chamados", filterDate],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("chamados_pos_venda")
        .select("id, tipo, status, created_at, contrato_id, contratos(cliente_nome)")
        .gte("created_at", filterDate)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const { data: medicoes = [] } = useQuery({
    queryKey: ["mapa-medicoes", filterDate],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("tecnico_agendamentos")
        .select("id, data_agendamento, status, created_at, contrato_id, contratos(cliente_nome)")
        .gte("created_at", filterDate)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  /* ─── Derived data ─── */
  const dots: OperationDot[] = useMemo(() => {
    const result: OperationDot[] = [];

    (entregas as any[]).forEach((e, i) => {
      const pos = seededPosition(e.id || `ent-${i}`, i);
      result.push({
        id: `ent-${e.id}`,
        type: "entrega",
        label: `Entrega ${e.status || "agendada"}`,
        cliente: e.contratos?.cliente_nome || "Cliente",
        endereco: e.contratos?.endereco_entrega,
        x: pos.x,
        y: pos.y,
        time: formatTime(e.created_at),
      });
    });

    (montagens as any[]).forEach((m, i) => {
      const pos = seededPosition(m.id || `mont-${i}`, i + 100);
      result.push({
        id: `mont-${m.id}`,
        type: "montagem",
        label: `Montagem ${m.status || "agendada"}`,
        cliente: m.contratos?.cliente_nome || "Cliente",
        x: pos.x,
        y: pos.y,
        time: formatTime(m.created_at),
      });
    });

    (medicoes as any[]).forEach((med, i) => {
      const pos = seededPosition(med.id || `med-${i}`, i + 200);
      result.push({
        id: `med-${med.id}`,
        type: "medicao",
        label: `Medição ${med.status || "agendada"}`,
        cliente: med.contratos?.cliente_nome || "Cliente",
        x: pos.x,
        y: pos.y,
        time: formatTime(med.created_at),
      });
    });

    (chamados as any[]).forEach((c, i) => {
      const pos = seededPosition(c.id || `cham-${i}`, i + 300);
      result.push({
        id: `cham-${c.id}`,
        type: "chamado",
        label: `Chamado ${c.tipo || "aberto"}`,
        cliente: c.contratos?.cliente_nome || "Cliente",
        x: pos.x,
        y: pos.y,
        time: formatTime(c.created_at),
      });
    });

    return result;
  }, [entregas, montagens, medicoes, chamados]);

  const feedItems: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = [];

    (entregas as any[]).slice(0, 5).forEach((e) => {
      items.push({
        id: `feed-ent-${e.id}`,
        type: "entrega",
        action: "Entrega agendada",
        cliente: e.contratos?.cliente_nome || "Cliente",
        time: formatTime(e.created_at),
        endereco: e.contratos?.endereco_entrega,
      });
    });

    (montagens as any[]).slice(0, 5).forEach((m) => {
      items.push({
        id: `feed-mont-${m.id}`,
        type: "montagem",
        action: "Montagem iniciada",
        cliente: m.contratos?.cliente_nome || "Cliente",
        time: formatTime(m.created_at),
      });
    });

    (chamados as any[]).slice(0, 3).forEach((c) => {
      items.push({
        id: `feed-cham-${c.id}`,
        type: "chamado",
        action: `Chamado ${c.tipo || "aberto"}`,
        cliente: c.contratos?.cliente_nome || "Cliente",
        time: formatTime(c.created_at),
      });
    });

    return items.sort((a, b) => (a.time > b.time ? -1 : 1)).slice(0, 12);
  }, [entregas, montagens, chamados]);

  const counts = useMemo(
    () => ({
      entrega: (entregas as any[]).length,
      montagem: (montagens as any[]).length,
      medicao: (medicoes as any[]).length,
      chamado: (chamados as any[]).length,
    }),
    [entregas, montagens, medicoes, chamados]
  );

  const totalOps = counts.entrega + counts.montagem + counts.medicao + counts.chamado;
  const concluidas = [
    ...(entregas as any[]).filter((e: any) => e.status === "entregue" || e.status === "concluido"),
    ...(montagens as any[]).filter((m: any) => m.status === "concluida" || m.status === "concluido"),
  ].length;
  const emAndamento = totalOps - concluidas;
  const taxaConclusao = totalOps > 0 ? Math.round((concluidas / totalOps) * 100) : 0;

  /* ─── Render ─── */
  return (
    <>
      <style>{animationStyles}</style>
      <div className="flex h-full min-h-screen flex-col bg-[#060a12]">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Mapa de Operações
            </h1>
            <p className="mt-0.5 text-sm text-[#6B7A90]">
              Centro de controle operacional em tempo real
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(["hoje", "semana", "mes"] as FilterPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                  period === p
                    ? "bg-[#1E6FBF] text-white shadow-lg shadow-[#1E6FBF]/30"
                    : "bg-white/5 text-[#6B7A90] hover:bg-white/10 hover:text-white"
                }`}
              >
                {p === "hoje" ? "Hoje" : p === "semana" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>
        </header>

        {/* Main content */}
        <div className="flex flex-1 flex-col lg:flex-row">
          {/* Left - Map Area (70%) */}
          <div className="relative flex-1 lg:w-[70%]">
            {/* Grid background */}
            <div
              className="absolute inset-0"
              style={{
                background: `
                  linear-gradient(rgba(30,111,191,0.03) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(30,111,191,0.03) 1px, transparent 1px)
                `,
                backgroundSize: "40px 40px",
                animation: "mapa-grid-move 60s linear infinite",
              }}
            />

            {/* Radial gradient overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at 50% 50%, rgba(30,111,191,0.06) 0%, transparent 70%)",
              }}
            />

            {/* Operation dots */}
            <div className="relative h-full min-h-[400px] lg:min-h-0">
              {dots.map((dot) => {
                const config = TYPE_CONFIG[dot.type];
                const isHovered = hoveredDot === dot.id;
                return (
                  <div
                    key={dot.id}
                    className="absolute cursor-pointer"
                    style={{
                      left: `${dot.x}%`,
                      top: `${dot.y}%`,
                      transform: "translate(-50%, -50%)",
                      zIndex: isHovered ? 50 : 10,
                    }}
                    onMouseEnter={() => setHoveredDot(dot.id)}
                    onMouseLeave={() => setHoveredDot(null)}
                  >
                    {/* Pulse ring */}
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        backgroundColor: config.color,
                        animation: "mapa-pulse 3s ease-in-out infinite",
                        animationDelay: `${(dot.x * 37) % 3000}ms`,
                      }}
                    />
                    {/* Dot */}
                    <div
                      className="relative h-3 w-3 rounded-full border border-white/30 transition-transform duration-200"
                      style={{
                        backgroundColor: config.color,
                        color: config.color,
                        animation: "mapa-glow 4s ease-in-out infinite",
                        animationDelay: `${(dot.y * 53) % 4000}ms`,
                        transform: isHovered ? "scale(1.8)" : "scale(1)",
                      }}
                    />
                    {/* Tooltip */}
                    {isHovered && (
                      <div
                        className="absolute bottom-full left-1/2 mb-3 w-56 -translate-x-1/2 rounded-xl border border-white/10 p-3 text-xs shadow-2xl"
                        style={{
                          background: "rgba(10, 14, 26, 0.95)",
                          backdropFilter: "blur(12px)",
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: config.color }}
                          />
                          <span className="font-semibold text-white">{dot.label}</span>
                        </div>
                        <p className="text-[#6B7A90]">{dot.cliente}</p>
                        {dot.endereco && (
                          <p className="mt-1 text-[#6B7A90] truncate">{dot.endereco}</p>
                        )}
                        <p className="mt-1 text-[#6B7A90]">{dot.time}</p>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Counter badges */}
              <div
                className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-3"
                style={{ animation: "mapa-counter-pop 0.6s ease-out" }}
              >
                {(Object.keys(TYPE_CONFIG) as Array<keyof typeof TYPE_CONFIG>).map((key) => {
                  const cfg = TYPE_CONFIG[key];
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2"
                      style={{
                        background: "rgba(10, 14, 26, 0.8)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                      <span className="text-xs font-semibold text-white">
                        {counts[key]}
                      </span>
                      <span className="text-xs text-[#6B7A90]">{cfg.label.split(" ")[0]}</span>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div
                className="absolute top-4 left-4 flex flex-col gap-1.5 rounded-lg border border-white/10 p-3"
                style={{
                  background: "rgba(10, 14, 26, 0.8)",
                  backdropFilter: "blur(8px)",
                }}
              >
                {(Object.keys(TYPE_CONFIG) as Array<keyof typeof TYPE_CONFIG>).map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: TYPE_CONFIG[key].color }}
                    />
                    <span className="text-[11px] text-[#6B7A90]">{TYPE_CONFIG[key].label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right - Activity Feed (30%) */}
          <aside className="w-full border-t border-white/5 lg:w-[30%] lg:border-l lg:border-t-0">
            <div className="flex items-center gap-2 border-b border-white/5 px-5 py-3">
              <Activity className="h-4 w-4 text-[#1E6FBF]" />
              <h2 className="text-sm font-semibold text-white">Atividade Recente</h2>
            </div>
            <div className="h-[calc(100%-48px)] overflow-y-auto px-4 py-3 scrollbar-thin scrollbar-thumb-white/10">
              {feedItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MapPin className="h-8 w-8 text-[#6B7A90]/50 mb-2" />
                  <p className="text-sm text-[#6B7A90]">Nenhuma operação encontrada</p>
                </div>
              )}
              {feedItems.map((item, idx) => {
                const cfg = TYPE_CONFIG[item.type];
                const Icon = cfg.icon;
                return (
                  <div
                    key={item.id}
                    className="mb-2 flex items-start gap-3 rounded-lg border border-white/5 p-3 transition-colors hover:bg-white/[0.02]"
                    style={{
                      animation: `mapa-feed-in 0.4s ease-out ${idx * 60}ms both`,
                    }}
                  >
                    <div
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${cfg.color}20` }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-white truncate">
                        {item.action}
                      </p>
                      <p className="text-[11px] text-[#6B7A90] truncate">
                        {item.cliente}
                      </p>
                      {item.endereco && (
                        <p className="text-[11px] text-[#6B7A90]/70 truncate">
                          {item.endereco}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] font-medium text-[#6B7A90]">
                      {item.time}
                    </span>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>

        {/* Bottom Stats Bar */}
        <footer className="border-t border-white/5 bg-[#0a0e1a]/80 px-6 py-4 backdrop-blur-sm">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard
              icon={Activity}
              label="Total operações"
              value={totalOps.toString()}
              color="#1E6FBF"
            />
            <StatCard
              icon={Clock}
              label="Em andamento"
              value={emAndamento.toString()}
              color="#F59E0B"
            />
            <StatCard
              icon={CheckCircle2}
              label="Concluídas"
              value={concluidas.toString()}
              color="#10B981"
            />
            <StatCard
              icon={AlertTriangle}
              label="Chamados"
              value={counts.chamado.toString()}
              color="#EF4444"
            />
            <StatCard
              icon={TrendingUp}
              label="Taxa conclusão"
              value={`${taxaConclusao}%`}
              color="#8B5CF6"
            />
          </div>
        </footer>
      </div>
    </>
  );
}

/* ─── Stat Card sub-component ─── */
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-white/5 px-4 py-3"
      style={{
        background: "rgba(255,255,255,0.02)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div>
        <p className="text-lg font-bold text-white leading-tight">{value}</p>
        <p className="text-[11px] text-[#6B7A90]">{label}</p>
      </div>
    </div>
  );
}
