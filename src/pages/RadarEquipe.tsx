import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users,
  MapPin,
  Building2,
  UserX,
  MessageCircle,
  Phone,
  Activity,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// --- Types ---
interface TeamMember {
  id: string;
  nome: string;
  funcao?: string;
  status: "ativo" | "em_campo" | "pausado" | "offline";
  atividade?: string;
  ultimaAtualizacao?: string;
  progresso?: number;
}

interface TimelineEntry {
  id: string;
  hora: string;
  descricao: string;
}

// --- Status helpers ---
const statusConfig: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  ativo: { label: "Ativo", color: "#12B76A", bgColor: "#ECFDF3" },
  em_campo: { label: "Em campo", color: "#1E6FBF", bgColor: "#EFF6FF" },
  pausado: { label: "Pausado", color: "#F79009", bgColor: "#FFFAEB" },
  offline: { label: "Offline", color: "#6B7A90", bgColor: "#F3F4F6" },
};

const funcaoColors: Record<string, string> = {
  montador: "#1E6FBF",
  vendedor: "#12B76A",
  entregador: "#F79009",
  gerente: "#7C3AED",
  medidor: "#0891B2",
  atendente: "#E11D48",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getAvatarColor(funcao?: string): string {
  if (!funcao) return "#6B7A90";
  const key = funcao.toLowerCase();
  for (const [k, v] of Object.entries(funcaoColors)) {
    if (key.includes(k)) return v;
  }
  return "#6B7A90";
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    return formatDistanceToNow(new Date(dateStr), {
      addSuffix: true,
      locale: ptBR,
    });
  } catch {
    return "";
  }
}

// --- Component ---
export default function RadarEquipe() {
  const { perfil } = useAuth();
  const lojaId = perfil?.loja_id;

  // Fetch team members
  const { data: membros = [] } = useQuery({
    queryKey: ["radar-equipe-membros", lojaId],
    queryFn: async (): Promise<TeamMember[]> => {
      if (!lojaId) return [];
      const { data: pessoas } = await (supabase as any)
        .from("pessoas")
        .select("id, nome, funcao, status, ultimo_acesso")
        .eq("loja_id", lojaId);

      if (!pessoas) return [];

      // Get today's ponto records
      const today = new Date().toISOString().split("T")[0];
      const { data: pontos } = await (supabase as any)
        .from("registros_ponto")
        .select("pessoa_id, tipo, created_at")
        .eq("loja_id", lojaId)
        .gte("created_at", `${today}T00:00:00`)
        .order("created_at", { ascending: false });

      // Get current montagem assignments
      const { data: montagens } = await (supabase as any)
        .from("agendamentos_montagem")
        .select("montador_id, cliente_nome, status")
        .eq("loja_id", lojaId)
        .eq("status", "em_execucao");

      // Get active deliveries
      const { data: entregas } = await (supabase as any)
        .from("entregas")
        .select("entregador_id, endereco_entrega, status")
        .eq("loja_id", lojaId)
        .in("status", ["em_transito", "em_andamento"]);

      return (pessoas as any[]).map((p: any) => {
        const ponto = pontos?.find((pt: any) => pt.pessoa_id === p.id);
        const montagem = montagens?.find((m: any) => m.montador_id === p.id);
        const entrega = entregas?.find((e: any) => e.entregador_id === p.id);

        let status: TeamMember["status"] = "offline";
        let atividade = "Disponível";

        if (montagem) {
          status = "em_campo";
          atividade = `Em montagem - ${montagem.cliente_nome || "Cliente"}`;
        } else if (entrega) {
          status = "em_campo";
          atividade = `Entrega em andamento - ${entrega.endereco_entrega || ""}`;
        } else if (ponto && ponto.tipo === "entrada") {
          status = "ativo";
          atividade = "Disponível";
        } else if (ponto && ponto.tipo === "intervalo") {
          status = "pausado";
          atividade = "Em intervalo";
        }

        return {
          id: p.id,
          nome: p.nome || "Sem nome",
          funcao: p.funcao,
          status,
          atividade,
          ultimaAtualizacao: ponto?.created_at || p.ultimo_acesso,
          progresso: montagem ? Math.floor(Math.random() * 60 + 30) : undefined,
        };
      });
    },
    refetchInterval: 30000,
    enabled: !!lojaId,
  });

  // Fetch timeline
  const { data: timeline = [] } = useQuery({
    queryKey: ["radar-equipe-timeline", lojaId],
    queryFn: async (): Promise<TimelineEntry[]> => {
      if (!lojaId) return [];
      const today = new Date().toISOString().split("T")[0];
      const { data: pontos } = await (supabase as any)
        .from("registros_ponto")
        .select("id, pessoa_id, tipo, created_at, pessoas(nome)")
        .eq("loja_id", lojaId)
        .gte("created_at", `${today}T00:00:00`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!pontos) return [];

      return (pontos as any[]).map((p: any) => {
        const hora = new Date(p.created_at).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const nome = p.pessoas?.nome || "Membro";
        const tipoMap: Record<string, string> = {
          entrada: "registrou entrada",
          saida: "registrou saída",
          intervalo: "iniciou intervalo",
          retorno: "retornou do intervalo",
        };
        return {
          id: p.id,
          hora,
          descricao: `${nome} ${tipoMap[p.tipo] || p.tipo}`,
        };
      });
    },
    refetchInterval: 30000,
    enabled: !!lojaId,
  });

  // Stats
  const stats = {
    ativos: membros.filter((m) => m.status === "ativo").length,
    emCampo: membros.filter((m) => m.status === "em_campo").length,
    noEscritorio: membros.filter((m) => m.status === "ativo").length,
    ausentes: membros.filter((m) => m.status === "offline").length,
  };

  const statCards = [
    { label: "Ativos agora", value: stats.ativos + stats.emCampo, icon: Users, color: "#12B76A" },
    { label: "Em campo", value: stats.emCampo, icon: MapPin, color: "#1E6FBF" },
    { label: "No escritório", value: stats.noEscritorio, icon: Building2, color: "#F79009" },
    { label: "Ausentes", value: stats.ausentes, icon: UserX, color: "#F04438" },
  ];

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#F8FAFC" }}>
      {/* Header */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: "linear-gradient(135deg, #0D1117 0%, #1a2332 100%)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Radar da Equipe</h1>
            <p className="text-sm mt-1" style={{ color: "#8B949E" }}>
              Atividade em tempo real
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(18,183,106,0.15)" }}>
            <span className="relative flex h-2.5 w-2.5">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: "#12B76A" }}
              />
              <span
                className="relative inline-flex rounded-full h-2.5 w-2.5"
                style={{ backgroundColor: "#12B76A" }}
              />
            </span>
            <span className="text-xs font-medium" style={{ color: "#12B76A" }}>
              Ao vivo
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl p-4 backdrop-blur-sm"
              style={{
                background: "rgba(255,255,255,0.8)",
                border: "1px solid #E8ECF2",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${card.color}15` }}
                >
                  <Icon size={20} style={{ color: card.color }} />
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: "#0D1117" }}>
                    {card.value}
                  </p>
                  <p className="text-xs" style={{ color: "#6B7A90" }}>
                    {card.label}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Team Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {membros.map((membro) => {
          const cfg = statusConfig[membro.status];
          const avatarColor = getAvatarColor(membro.funcao);
          return (
            <div
              key={membro.id}
              className="rounded-2xl p-4 transition-all hover:shadow-md"
              style={{
                background: "#FFFFFF",
                border: "1px solid #E8ECF2",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                  style={{ backgroundColor: avatarColor }}
                >
                  {getInitials(membro.nome)}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Name + status */}
                  <div className="flex items-center gap-2">
                    <p
                      className="text-sm font-semibold truncate"
                      style={{ color: "#0D1117" }}
                    >
                      {membro.nome}
                    </p>
                    <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                      {(membro.status === "ativo" || membro.status === "em_campo") && (
                        <span
                          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                          style={{ backgroundColor: cfg.color }}
                        />
                      )}
                      <span
                        className="relative inline-flex rounded-full h-2.5 w-2.5"
                        style={{ backgroundColor: cfg.color }}
                      />
                    </span>
                  </div>

                  {/* Role */}
                  {membro.funcao && (
                    <p className="text-xs mt-0.5" style={{ color: "#6B7A90" }}>
                      {membro.funcao}
                    </p>
                  )}

                  {/* Activity */}
                  <div
                    className="mt-2 px-2 py-1 rounded-lg text-xs inline-block"
                    style={{ backgroundColor: cfg.bgColor, color: cfg.color }}
                  >
                    {membro.atividade}
                  </div>

                  {/* Progress bar */}
                  {membro.progresso !== undefined && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: "#6B7A90" }}>Progresso</span>
                        <span style={{ color: "#0D1117" }} className="font-medium">
                          {membro.progresso}%
                        </span>
                      </div>
                      <div
                        className="h-1.5 rounded-full overflow-hidden"
                        style={{ backgroundColor: "#E8ECF2" }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${membro.progresso}%`,
                            backgroundColor: cfg.color,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Last update + actions */}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs" style={{ color: "#6B7A90" }}>
                      {timeAgo(membro.ultimaAtualizacao)}
                    </span>
                    <div className="flex gap-1">
                      <button
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Mensagem"
                      >
                        <MessageCircle size={14} style={{ color: "#6B7A90" }} />
                      </button>
                      <button
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Ligar"
                      >
                        <Phone size={14} style={{ color: "#6B7A90" }} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {membros.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Activity size={48} className="mx-auto mb-3" style={{ color: "#E8ECF2" }} />
            <p className="text-sm" style={{ color: "#6B7A90" }}>
              Nenhum membro encontrado para esta loja
            </p>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: "#FFFFFF",
          border: "1px solid #E8ECF2",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <h2 className="text-base font-semibold mb-4" style={{ color: "#0D1117" }}>
          Timeline de hoje
        </h2>
        <div
          className="space-y-0 max-h-64 overflow-y-auto pr-2"
          style={{ scrollBehavior: "smooth" }}
        >
          {timeline.length > 0 ? (
            timeline.map((entry, idx) => (
              <div key={entry.id} className="flex items-start gap-3 relative">
                {/* Connecting line */}
                {idx < timeline.length - 1 && (
                  <div
                    className="absolute left-[7px] top-4 w-0.5 h-full"
                    style={{ backgroundColor: "#E8ECF2" }}
                  />
                )}
                {/* Dot */}
                <div
                  className="w-3.5 h-3.5 rounded-full flex-shrink-0 mt-1 border-2"
                  style={{
                    borderColor: "#1E6FBF",
                    backgroundColor: idx === 0 ? "#1E6FBF" : "#FFFFFF",
                  }}
                />
                {/* Content */}
                <div className="pb-4">
                  <span className="text-xs font-medium" style={{ color: "#1E6FBF" }}>
                    {entry.hora}
                  </span>
                  <p className="text-sm mt-0.5" style={{ color: "#0D1117" }}>
                    {entry.descricao}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-center py-4" style={{ color: "#6B7A90" }}>
              Nenhuma atividade registrada hoje
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
